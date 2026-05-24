import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useToast } from "@/src/components/shared/ToastProvider";
import { Pagination } from "@/src/components/shared/Pagination";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import type { FooterAction } from "@/src/components/navigation/AppFooter";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { designTokens } from "@/src/design-system/tokens";
import type { AdminPayrollPeriodDetail, AdminPayrollLineItem } from "@/src/services/payrollService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  getPayrollPeriodExportUrl,
  getPayrollPeriodReportPdfUrl,
  getPayrollPeriodReportXlsxUrl,
  submitPayrollLineOverride,
  approvePayrollLineOverride,
  getAdminPayrollVoucherUrl,
  getAdminPayrollBulkVouchersUrl,
} from "@/src/services/payrollService";
import { getCachedAuthSession } from "@/src/services/authSession";
import { formatDateES, formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { hapticFeedback } from "@/src/utils/haptics";

const SERVICE_REQUEST_ID_PATTERN = /\s*·?\s*solicitud\s*[0-9a-fA-F-]{36}\s*$/i;
const GUID_PATTERN = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  hogar_diario: "Hogar diario",
  hogar_basico: "Hogar básico",
  hogar_estandar: "Hogar estándar",
  hogar_premium: "Hogar premium",
  domicilio_dia_12h: "Domicilio día (12h)",
  domicilio_noche_12h: "Domicilio noche (12h)",
  domicilio_24h: "Domicilio 24h",
  suero: "Suero",
  medicamentos: "Medicamentos",
  sonda_vesical: "Sonda vesical",
  sonda_nasogastrica: "Sonda nasogástrica",
  sonda_peg: "Sonda PEG",
  curas: "Curas",
};

const formatServiceLabel = (description: string) => {
  const cleanedService = description
    .replace(SERVICE_REQUEST_ID_PATTERN, "")
    .replace(GUID_PATTERN, "")
    .replace(/\bsolicitud\b/gi, "")
    .replace(/^Servicio\s+/i, "")
    .trim();
  const normalizedServiceCode = cleanedService.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const mappedService = SERVICE_DISPLAY_NAMES[normalizedServiceCode];
  if (mappedService) return mappedService;

  const rawService = cleanedService
    .replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!rawService) return "Servicio";
  return rawService.charAt(0).toUpperCase() + rawService.slice(1);
};

interface PeriodDetailProps {
  period: AdminPayrollPeriodDetail;
  onClose: () => Promise<void>;
  onBack: () => void;
  onPrepareRecalculate?: () => void;
  /**
   * Bubble the detail-mode footer actions up to the parent shell so they
   * land in the global `workflowActions` slot (skill §5: CTAs go in the
   * footer, content-sized, single 56px row).
   */
  onSetActions?: (actions: FooterAction[]) => void;
  /** Offered only for an Open period with no calculated lines (created by error). */
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
}

async function downloadAndShare(
  url: string,
  filename: string,
  downloadFailureMessage = "No fue posible descargar el archivo.",
): Promise<"shared" | "unavailable"> {
  const session = getCachedAuthSession();
  const token = session?.token;
  if (!token) {
    throw new Error("No hay sesión activa.");
  }
  const fileUri = FileSystem.documentDirectory + filename;
  const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (downloadRes.status === 200) {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloadRes.uri);
      return "shared";
    } else {
      return "unavailable";
    }
  } else {
    throw new Error(downloadFailureMessage);
  }
}

export function PeriodDetail({ period, onClose, onBack, onPrepareRecalculate, onSetActions, onEdit, onDelete }: PeriodDetailProps) {
  const { showToast } = useToast();
  const isOpen = period.status === "Open";

  // CSV export state
  const [exporting, setExporting] = useState<string | null>(null);

  // Override modal state
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [overrideLine, setOverrideLine] = useState<AdminPayrollLineItem | null>(null);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [immutabilityErrorVisible, setImmutabilityErrorVisible] = useState(false);

  // Approve override state
  const [approvingLineId, setApprovingLineId] = useState<string | null>(null);

  // Voucher download state
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);
  const [downloadingBulk, setDownloadingBulk] = useState(false);

  // Per-list pagination — both the staff summary and the payroll lines can
  // run long on a busy period. Reset to page 1 when the period changes.
  const [staffPage, setStaffPage] = useState(1);
  const [linesPage, setLinesPage] = useState(1);
  useEffect(() => {
    setStaffPage(1);
    setLinesPage(1);
  }, [period.id]);

  // Nurse detail drilldown modal state
  const [nurseDetailModalVisible, setNurseDetailModalVisible] = useState(false);
  const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
  const [selectedNurseName, setSelectedNurseName] = useState<string>("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);

  // --- Report export/view actions ---
  const handleExport = async (format: "pdf" | "xlsx" | "csv") => {
    if (exporting) return;
    hapticFeedback.light();
    setExporting(format);
    try {
      const exportConfig = {
        pdf: {
          url: getPayrollPeriodReportPdfUrl(period.id),
          filename: `reporte-nomina-${period.id}.pdf`,
          failureMessage: "No fue posible descargar el PDF.",
        },
        xlsx: {
          url: getPayrollPeriodReportXlsxUrl(period.id),
          filename: `reporte-nomina-${period.id}.xlsx`,
          failureMessage: "No fue posible descargar el Excel.",
        },
        csv: {
          url: getPayrollPeriodExportUrl(period.id),
          filename: `nomina-${period.id}-${Date.now()}.csv`,
          failureMessage: "No fue posible descargar el CSV.",
        },
      }[format];
      const { url, filename, failureMessage } = exportConfig;
      const result = await downloadAndShare(url, filename, failureMessage);
      if (result === "unavailable") {
        showToast({ variant: "info", message: "Archivo descargado pero compartir no está disponible." });
      }
    } catch (e) {
      const fallbackMessage = `No fue posible descargar el ${format === "xlsx" ? "Excel" : format.toUpperCase()}.`;
      const message = e instanceof Error && e.message.startsWith("No fue posible")
        ? e.message
        : fallbackMessage;
      showToast({ variant: "error", message });
    } finally {
      setExporting(null);
    }
  };

  // --- Override modal ---
  const openOverrideModal = (line: AdminPayrollLineItem) => {
    hapticFeedback.selection();
    if (!isOpen) {
      setImmutabilityErrorVisible(true);
      return;
    }

    setImmutabilityErrorVisible(false);
    setOverrideLine(line);
    setOverrideAmount("");
    setOverrideReason("");
    setOverrideModalVisible(true);
  };

  const handleSubmitOverride = async () => {
    if (!overrideLine) return;
    hapticFeedback.light();
    const parsed = parseFloat(overrideAmount);
    if (isNaN(parsed) || parsed < 0) {
      showToast({ variant: "error", message: "Ingresa un monto válido." });
      return;
    }
    if (!overrideReason.trim()) {
      showToast({ variant: "error", message: "La razón es requerida." });
      return;
    }
    setOverrideSubmitting(true);
    try {
      await submitPayrollLineOverride(overrideLine.id, {
        overrideAmount: parsed,
        reason: overrideReason.trim(),
      });
      setOverrideModalVisible(false);
      showToast({ variant: "success", message: "Ajuste enviado correctamente." });
    } catch (e) {
      showToast({ variant: "error", message: e instanceof Error ? e.message : "No fue posible enviar el ajuste." });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // --- Approve override (keep destructive confirmation as Alert.alert) ---
  const handleApproveOverride = async (line: AdminPayrollLineItem) => {
    hapticFeedback.selection();
    Alert.alert(
      "Aprobar ajuste",
      "¿Confirmar la aprobación del ajuste pendiente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          onPress: async () => {
            setApprovingLineId(line.id);
            try {
              await approvePayrollLineOverride(line.id);
              showToast({ variant: "success", message: "Ajuste aprobado correctamente." });
            } catch (e) {
              showToast({ variant: "error", message: e instanceof Error ? e.message : "No fue posible aprobar el ajuste." });
            } finally {
              setApprovingLineId(null);
            }
          },
        },
      ]
    );
  };

  // --- Individual voucher download ---
  const handleDownloadVoucher = async (nurseUserId: string, nurseDisplayName: string) => {
    hapticFeedback.light();
    setDownloadingVoucherId(nurseUserId);
    try {
      const url = getAdminPayrollVoucherUrl(period.id, nurseUserId);
      const safeName = nurseDisplayName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const filename = `comprobante-${safeName}-${period.id}.pdf`;
      const result = await downloadAndShare(url, filename);
      if (result === "unavailable") {
        showToast({ variant: "info", message: "Archivo descargado pero compartir no está disponible." });
      }
    } catch (e) {
      showToast({ variant: "error", message: e instanceof Error ? e.message : "No fue posible descargar el comprobante." });
    } finally {
      setDownloadingVoucherId(null);
    }
  };

  // --- Bulk voucher download ---
  const handleDownloadAllVouchers = async () => {
    if (downloadingBulk) return;
    hapticFeedback.light();
    setDownloadingBulk(true);
    try {
      const url = getAdminPayrollBulkVouchersUrl(period.id);
      const filename = `comprobantes-${period.id}-${Date.now()}.zip`;
      const result = await downloadAndShare(url, filename);
      if (result === "unavailable") {
        showToast({ variant: "info", message: "Archivos descargados pero compartir no está disponible." });
      }
    } catch (e) {
      showToast({ variant: "error", message: e instanceof Error ? e.message : "No fue posible descargar los comprobantes." });
    } finally {
      setDownloadingBulk(false);
    }
  };

  // --- Nurse drilldown ---
  const handleNursePress = (nurseUserId: string, nurseDisplayName: string) => {
    hapticFeedback.selection();
    setSelectedNurseId(nurseUserId);
    setSelectedNurseName(nurseDisplayName);
    setNurseDetailModalVisible(true);
  };

  // --- Period close (keep destructive confirmation as Alert.alert) ---
  const handleClosePeriod = () => {
    hapticFeedback.selection();
    // Safeguard: flag nurses whose pay is 0 (rate not set) or negative (deductions > gross) before
    // locking the period. Closing is irreversible, so surface this for review first.
    const flagged = period.staffSummary.filter((s) => s.netCompensation <= 0);
    const warning =
      flagged.length > 0
        ? `\n\nAtención: ${flagged.length} enfermera(s) con pago en 0 o negativo (revisa tarifas y deducciones). El cierre es irreversible.`
        : "";
    Alert.alert(
      "Cerrar Período",
      `Antes de cerrar (es irreversible), confirma que revisaste:\n• Deducciones y descuentos\n• Ajustes por servicio\n• Comprobantes descargados${warning}\n\n¿Cerrar el período "${formatDateES(period.startDate)} - ${formatDateES(period.endDate)}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Período",
          style: "destructive",
          onPress: async () => {
            try {
              await onClose();
            } catch (e) {
              const message = e instanceof Error ? e.message : "No fue posible cerrar el período.";
              showToast({ variant: "error", message });
            }
          },
        },
      ]
    );
  };

  // --- Period delete (destructive confirmation, mirrors close) ---
  const handleDeletePeriodConfirm = () => {
    hapticFeedback.selection();
    Alert.alert(
      "Eliminar Período",
      `¿Eliminar el período "${formatDateES(period.startDate)} - ${formatDateES(period.endDate)}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => { void onDelete?.(); },
        },
      ]
    );
  };

  // Emit footer actions to the parent shell. A freshly created Open period with no
  // calculated lines surfaces Editar/Eliminar (the "created by error" case). Once it
  // has payroll lines, those give way to the export/voucher actions. Closed periods
  // stay read-only with export only.
  useEffect(() => {
    if (!onSetActions) return;
    const actions: FooterAction[] = [];
    // Authoritative flag from the API: Open AND no lines AND no deductions/installments.
    const canManage = period.canModify;

    if (canManage && onEdit) {
      actions.push({
        label: "Editar",
        onPress: onEdit,
        variant: "secondary",
        testID: "admin-period-edit-button",
      });
    }
    if (canManage && onDelete) {
      actions.push({
        label: "Eliminar",
        onPress: handleDeletePeriodConfirm,
        variant: "danger",
        testID: "admin-period-delete-button",
      });
    }
    if (isOpen && onPrepareRecalculate) {
      actions.push({
        label: "Recalcular",
        onPress: onPrepareRecalculate,
        variant: "secondary",
      });
    }
    if (!canManage) {
      actions.push({
        label: exporting === "pdf" ? "Exportando…" : "PDF",
        onPress: () => handleExport("pdf"),
        variant: "secondary",
        disabled: Boolean(exporting),
        testID: "admin-period-export-pdf-button",
      });
      actions.push({
        label: exporting === "xlsx" ? "Exportando…" : "Excel",
        onPress: () => handleExport("xlsx"),
        variant: "secondary",
        disabled: Boolean(exporting),
        testID: "admin-period-export-xlsx-button",
      });
      actions.push({
        label: downloadingBulk ? "Descargando…" : "Comprobantes",
        onPress: handleDownloadAllVouchers,
        variant: "secondary",
        disabled: downloadingBulk,
        testID: "admin-period-bulk-vouchers-button",
      });
    }
    if (isOpen && !canManage) {
      actions.push({
        label: "Cerrar período",
        onPress: handleClosePeriod,
        variant: "danger",
      });
    }
    onSetActions(actions);
    return () => {
      onSetActions([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exporting, downloadingBulk, period.id, period.canModify, onEdit, onDelete]);

  const totalGross = period.staffSummary.reduce((sum, s) => sum + s.grossCompensation, 0);
  const totalNet = period.staffSummary.reduce((sum, s) => sum + s.netCompensation, 0);
  const statusTitle = isOpen ? "Nómina en revisión" : "Nómina cerrada";
  const statusDescription = isOpen
    ? "Puedes revisar líneas, corregir montos y cerrar el período cuando esté listo."
    : "Período finalizado. Los comprobantes y reportes están disponibles para descarga.";
  const periodLabel = `${formatDateES(period.startDate)} - ${formatDateES(period.endDate)}`;
  const nurseCountLabel = `${period.staffSummary.length} enfermera${period.staffSummary.length === 1 ? "" : "s"}`;
  const lineCountLabel = `${period.lines.length} línea${period.lines.length === 1 ? "" : "s"}`;

  const PAGE_SIZE = 10;
  const totalStaffPages = Math.ceil(period.staffSummary.length / PAGE_SIZE);
  const visibleStaff = period.staffSummary.slice(
    (staffPage - 1) * PAGE_SIZE,
    staffPage * PAGE_SIZE,
  );
  const totalLinePages = Math.ceil(period.lines.length / PAGE_SIZE);
  const visibleLines = period.lines.slice(
    (linesPage - 1) * PAGE_SIZE,
    linesPage * PAGE_SIZE,
  );

  const nurseLines = selectedNurseId
    ? period.lines.filter((l) => l.nurseUserId === selectedNurseId)
    : [];
  const nurseDeductionLines = nurseLines.filter((line) => line.deductionsTotal > 0);
  const getLineFacts = (line: AdminPayrollLineItem): Array<{ label: string; value: string; emphasized?: boolean }> => [
    { label: "Base", value: formatCurrency(line.baseCompensation) },
    { label: "Ajustes", value: formatCurrency(line.adjustmentsTotal) },
    { label: "Deducciones", value: formatCurrency(line.deductionsTotal) },
    { label: "Pago", value: formatCurrency(line.netCompensation), emphasized: true },
    ...(line.serviceSubtotal > 0
      ? [
          { label: "Cobrado", value: formatCurrency(line.serviceSubtotal) },
          { label: "Margen", value: formatCurrency(line.serviceSubtotal - line.netCompensation) },
        ]
      : []),
  ];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        testID="admin-payroll-period-detail-page"
        nativeID="admin-payroll-period-detail-page"
      >
        {/* Hidden loaded marker */}
        <Text
          testID="payroll-period-detail-loaded"
          nativeID="payroll-period-detail-loaded"
          style={styles.hiddenMarker}
        >
          {" "}
        </Text>

        {immutabilityErrorVisible && (
          <View style={styles.errorToast} testID="error-toast" nativeID="error-toast">
            <Text style={styles.errorToastText}>
              Este período está cerrado. No se pueden registrar modificaciones.
            </Text>
          </View>
        )}

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewTitleGroup}>
              <Text style={styles.overviewEyebrow}>Nómina</Text>
              <Text style={styles.overviewTitle}>{statusTitle}</Text>
              <Text style={styles.overviewPeriod}>{periodLabel}</Text>
            </View>
            <StatusBadge
              label={isOpen ? "Abierto" : "Cerrado"}
              tone={isOpen ? "success" : "neutral"}
              testID={adminTestIds.payroll.periodStatusBadge}
            />
          </View>

          <Text style={styles.overviewDescription}>{statusDescription}</Text>

          <View style={styles.netPanel}>
            <Text style={styles.netLabel}>Total neto a pagar</Text>
            <Text style={styles.netValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(totalNet)}
            </Text>
            <Text style={styles.netSupporting}>
              Bruto {formatCurrency(totalGross)} • {lineCountLabel} • {nurseCountLabel}
            </Text>
          </View>

          <View style={styles.timelineGrid}>
            <View style={styles.timelineItem}>
              <Text style={styles.metaLabel}>Corte</Text>
              <Text style={styles.metaValue}>{formatDateES(period.cutoffDate)}</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.metaLabel}>Pago</Text>
              <Text style={styles.metaValue}>{formatDateES(period.paymentDate)}</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.metaLabel}>{period.closedAtUtc ? "Cerrado" : "Creado"}</Text>
              <Text style={styles.metaValue}>
                {period.closedAtUtc ? formatDateTimeES(period.closedAtUtc) : formatDateTimeES(period.createdAtUtc)}
              </Text>
            </View>
          </View>
        </View>

        {/* Staff summary — tappable names + voucher download */}
        <View
          style={styles.staffSection}
          testID="payroll-nurse-summary-table"
          nativeID="payroll-nurse-summary-table"
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Pagos por enfermera</Text>
              <Text style={styles.sectionSubtitle}>
                {nurseCountLabel} • comprobantes individuales
              </Text>
            </View>
          </View>

          {period.staffSummary.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay enfermeras en este período</Text>
            </View>
          ) : (
            visibleStaff.map((staff) => (
              <View
                key={staff.nurseUserId}
                style={styles.staffItem}
                testID="payroll-nurse-row"
                nativeID="payroll-nurse-row"
              >
                <View style={styles.staffHeader}>
                  <Pressable
                    onPress={() => handleNursePress(staff.nurseUserId, staff.nurseDisplayName)}
                    testID={`admin-staff-name-${staff.nurseUserId}`}
                    nativeID={`admin-staff-name-${staff.nurseUserId}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver detalle de ${staff.nurseDisplayName}`}
                    accessibilityHint="Abre las líneas y deducciones de esta enfermera"
                  >
                    <Text style={[styles.staffName, styles.staffNameTappable]}>
                      {staff.nurseDisplayName}
                    </Text>
                  </Pressable>
                  <Text style={styles.staffNet}>{formatCurrency(staff.netCompensation)}</Text>
                </View>
                <View style={styles.staffDetails}>
                  <Text style={styles.staffInfo}>{staff.lineCount} servicios</Text>
                  <Text style={styles.staffInfo}>
                    Bruto: {formatCurrency(staff.grossCompensation)}
                  </Text>
                </View>
                <View style={styles.staffActions}>
                  <Pressable
                    style={[
                      styles.voucherButton,
                      downloadingVoucherId === staff.nurseUserId && styles.buttonDisabled,
                    ]}
                    onPress={() => handleDownloadVoucher(staff.nurseUserId, staff.nurseDisplayName)}
                    disabled={downloadingVoucherId === staff.nurseUserId}
                    testID={`admin-staff-voucher-${staff.nurseUserId}`}
                    nativeID={`admin-staff-voucher-${staff.nurseUserId}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Descargar comprobante de ${staff.nurseDisplayName}`}
                    accessibilityState={{ busy: downloadingVoucherId === staff.nurseUserId }}
                  >
                    {downloadingVoucherId === staff.nurseUserId ? (
                      <ActivityIndicator color={designTokens.color.ink.accentStrong} size="small" accessibilityLabel="Cargando..." />
                    ) : (
                      <Text style={styles.voucherButtonText}>Descargar comprobante</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ))
          )}
          <Pagination
            currentPage={staffPage}
            totalPages={totalStaffPages}
            onPageChange={setStaffPage}
            testID="payroll-nurse-summary-pagination"
          />
        </View>

        {/* Per-line override section */}
        {period.lines.length > 0 && (
          <View
            style={styles.linesSection}
            testID="payroll-lines-table"
            nativeID="payroll-lines-table"
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Detalle de servicios</Text>
                <Text style={styles.sectionSubtitle}>
                  {lineCountLabel} de nómina{isOpen ? "" : " • solo lectura"}
                </Text>
              </View>
            </View>
            {visibleLines.map((line) => {
              const lineFacts = getLineFacts(line);
              const serviceLabel = formatServiceLabel(line.description);
              return (
              <View
                key={line.id}
                style={styles.lineItem}
                testID="payroll-service-detail-card"
                nativeID="payroll-service-detail-card"
              >
                <View style={styles.lineHeader}>
                  <Text style={styles.lineName} numberOfLines={1}>
                    {line.nurseDisplayName}
                  </Text>
                  <Text style={styles.lineNet}>{formatCurrency(line.netCompensation)}</Text>
                </View>
                <View style={styles.lineServiceBlock}>
                  <Text style={styles.lineEyebrow}>Servicio</Text>
                  <Text
                    style={styles.lineServiceName}
                    numberOfLines={2}
                    testID="payroll-service-detail-label"
                    nativeID="payroll-service-detail-label"
                  >
                    {serviceLabel}
                  </Text>
                </View>
                <View style={styles.lineFactsGrid}>
                  {lineFacts.map((fact) => (
                    <View key={`${line.id}-${fact.label}`} style={styles.lineFactCell}>
                      <Text style={styles.lineFactLabel}>{fact.label}</Text>
                      <Text
                        style={[styles.lineFactValue, fact.emphasized && styles.lineFactValueStrong]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {fact.value}
                      </Text>
                    </View>
                  ))}
                </View>
                {isOpen ? (
                  <View style={styles.lineActions}>
                    {line.pendingOverrideId ? (
                      <Pressable
                        style={[
                          styles.approveButton,
                          approvingLineId === line.id && styles.buttonDisabled,
                        ]}
                        onPress={() => handleApproveOverride(line)}
                        disabled={approvingLineId === line.id}
                        testID={`admin-line-approve-${line.id}`}
                        nativeID={`admin-line-approve-${line.id}`}
                        accessibilityRole="button"
                        accessibilityLabel="Aprobar ajuste pendiente de esta línea"
                        accessibilityState={{ busy: approvingLineId === line.id }}
                      >
                        {approvingLineId === line.id ? (
                          <ActivityIndicator color={designTokens.color.ink.inverse} size="small" accessibilityLabel="Cargando..." />
                        ) : (
                          <Text style={styles.approveButtonText}>Aprobar</Text>
                        )}
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.adjustButton}
                        onPress={() => openOverrideModal(line)}
                        testID="override-request-button"
                        nativeID="override-request-button"
                        accessibilityRole="button"
                        accessibilityLabel="Ajustar esta línea de nómina"
                      >
                        <Text style={styles.adjustButtonText}>Ajustar</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </View>
              );
            })}
            <Pagination
              currentPage={linesPage}
              totalPages={totalLinePages}
              onPageChange={setLinesPage}
              testID="payroll-lines-pagination"
            />
          </View>
        )}

      </ScrollView>

      {/* Override modal */}
      <Modal
        visible={overrideModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOverrideModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={styles.modalCard}
            testID="admin-line-override-modal"
            nativeID="admin-line-override-modal"
            accessibilityViewIsModal
          >
            <Text style={styles.modalTitle}>Ajustar línea de nómina</Text>
            {overrideLine && (
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                {overrideLine.nurseDisplayName} — {formatServiceLabel(overrideLine.description)}
              </Text>
            )}

            <Text style={styles.inputLabel}>Monto ajustado (DOP)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={overrideAmount}
              onChangeText={setOverrideAmount}
              placeholder="0.00"
              testID="admin-line-override-amount-input"
              nativeID="admin-line-override-amount-input"
              accessibilityLabel="Monto ajustado"
            />

            <Text style={styles.inputLabel}>Razón del ajuste</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              multiline
              value={overrideReason}
              onChangeText={setOverrideReason}
              placeholder="Describe el motivo del ajuste..."
              testID="admin-line-override-reason-input"
              nativeID="admin-line-override-reason-input"
              accessibilityLabel="Razón del ajuste"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  hapticFeedback.selection();
                  setOverrideModalVisible(false);
                }}
                disabled={overrideSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancelar ajuste"
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <Pressable
                style={[styles.modalButton, overrideSubmitting && styles.buttonDisabled]}
                onPress={handleSubmitOverride}
                disabled={overrideSubmitting}
                testID="admin-line-override-submit-button"
                nativeID="admin-line-override-submit-button"
                accessibilityRole="button"
                accessibilityLabel={overrideSubmitting ? "Enviando ajuste" : "Enviar ajuste de línea"}
                accessibilityState={{ busy: overrideSubmitting }}
              >
                {overrideSubmitting ? (
                  <ActivityIndicator color={designTokens.color.ink.inverse} size="small" accessibilityLabel="Cargando..." />
                ) : (
                  <Text style={styles.modalButtonText}>Enviar ajuste</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Nurse detail drilldown modal */}
      <Modal
        visible={nurseDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNurseDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, styles.nurseDetailModal]}
            testID="nurse-payroll-detail-panel"
            nativeID="nurse-payroll-detail-panel"
            accessibilityViewIsModal
          >
            {/* Loaded marker for nurse detail */}
            <Text
              testID="nurse-payroll-detail-loaded"
              nativeID="nurse-payroll-detail-loaded"
              style={styles.hiddenMarker}
            >
              {" "}
            </Text>

            <View style={styles.nurseDetailHeader}>
              <Text style={styles.modalTitle}>{selectedNurseName}</Text>
              <Pressable
                onPress={() => {
                  hapticFeedback.selection();
                  setNurseDetailModalVisible(false);
                }}
                testID="admin-nurse-detail-close-button"
                nativeID="admin-nurse-detail-close-button"
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle de enfermera"
              >
                <Text style={styles.closeX}>Cerrar</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.nurseDetailScroll}>
              <View
                testID="nurse-payroll-services-table"
                nativeID="nurse-payroll-services-table"
              >
                <Text style={styles.nurseDetailSectionTitle}>Servicios</Text>
                {nurseLines.length === 0 ? (
                  <Text style={styles.emptyText}>Sin líneas para este período.</Text>
                ) : (
                  nurseLines.map((line) => (
                    <View key={line.id} style={styles.nurseDetailLine}>
                      <Text style={styles.nurseDetailDescription} numberOfLines={2}>
                        {formatServiceLabel(line.description)}
                      </Text>
                      <View style={styles.nurseDetailAmounts}>
                        <Text style={styles.nurseDetailLabel}>Base:</Text>
                        <Text style={styles.nurseDetailValue}>
                          {formatCurrency(line.baseCompensation)}
                        </Text>
                      </View>
                      <View style={styles.nurseDetailAmounts}>
                        <Text style={styles.nurseDetailLabel}>Neto:</Text>
                        <Text style={[styles.nurseDetailValue, styles.summaryValueGreen]}>
                          {formatCurrency(line.netCompensation)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View
                style={styles.nurseDetailSection}
                testID="nurse-payroll-deductions-table"
                nativeID="nurse-payroll-deductions-table"
              >
                <Text style={styles.nurseDetailSectionTitle}>Deducciones</Text>
                {nurseDeductionLines.length === 0 ? (
                  <Text style={styles.emptyText}>Sin deducciones registradas para este período.</Text>
                ) : (
                  nurseDeductionLines.map((line) => (
                    <View key={`${line.id}-deduction`} style={styles.nurseDetailLine}>
                      <Text style={styles.nurseDetailDescription} numberOfLines={2}>
                        {formatServiceLabel(line.description)}
                      </Text>
                      <View style={styles.nurseDetailAmounts}>
                        <Text style={styles.nurseDetailLabel}>Deducción:</Text>
                        <Text style={[styles.nurseDetailValue, styles.summaryValueNegative]}>
                          {formatCurrency(line.deductionsTotal)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.color.surface.primary,
  },
  scrollContent: {
    paddingBottom: 112,
  },
  hiddenMarker: {
    height: 0,
    width: 0,
    opacity: 0,
  },
  errorToast: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: designTokens.color.surface.danger,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  errorToastText: {
    color: designTokens.color.status.dangerText,
    fontSize: 13,
    fontWeight: "600",
  },
  overviewCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  overviewTitleGroup: {
    flex: 1,
  },
  overviewEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    color: designTokens.color.ink.muted,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  overviewTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  overviewPeriod: {
    marginTop: 2,
    fontSize: 14,
    color: designTokens.color.ink.secondary,
    fontWeight: "600",
  },
  overviewDescription: {
    marginTop: 10,
    color: designTokens.color.ink.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  netPanel: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.success,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    marginBottom: 4,
  },
  netValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: designTokens.color.status.successText,
  },
  netSupporting: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: designTokens.color.ink.secondary,
  },
  timelineGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  timelineItem: {
    flex: 1,
    minHeight: 62,
    padding: 10,
    borderRadius: 10,
    backgroundColor: designTokens.color.surface.secondary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  headerActionButton: {
    flex: 1,
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  headerActionButtonSecondary: {
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.ink.accentStrong,
  },
  headerActionButtonWarning: {
    backgroundColor: designTokens.color.ink.accentStrong,
  },
  headerActionButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 13,
    fontWeight: "600",
  },
  headerActionButtonTextSecondary: {
    color: designTokens.color.ink.accentStrong,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  summarySection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: designTokens.color.ink.muted,
  },
  summaryGrid: {
    flexDirection: "row",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: designTokens.color.ink.primary,
  },
  summaryValueGreen: {
    color: designTokens.color.status.successText,
  },
  staffSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: designTokens.color.ink.muted,
  },
  staffItem: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  staffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    alignItems: "center",
  },
  staffName: {
    fontSize: 16,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  staffNameTappable: {
    color: designTokens.color.ink.accentStrong,
    textDecorationLine: "underline",
  },
  staffNet: {
    fontSize: 17,
    fontWeight: "800",
    color: designTokens.color.status.successText,
  },
  staffDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  staffInfo: {
    fontSize: 13,
    color: designTokens.color.ink.muted,
  },
  staffActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  voucherButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.color.ink.accentStrong,
    backgroundColor: designTokens.color.surface.primary,
    minWidth: 170,
    alignItems: "center",
  },
  voucherButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontSize: 13,
    fontWeight: "600",
  },
  linesSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
  },
  lineItem: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    alignItems: "center",
  },
  lineName: {
    fontSize: 15,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    flex: 1,
    marginRight: 8,
  },
  lineNet: {
    fontSize: 16,
    fontWeight: "800",
    color: designTokens.color.status.successText,
  },
  lineServiceBlock: {
    marginTop: 4,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  lineEyebrow: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    color: designTokens.color.ink.muted,
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: 3,
  },
  lineServiceName: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  lineFactsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  lineFactCell: {
    minWidth: 108,
    flexGrow: 1,
    flexBasis: "31%",
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  lineFactLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
    marginBottom: 2,
  },
  lineFactValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  lineFactValueStrong: {
    color: designTokens.color.status.successText,
  },
  lineDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    marginBottom: 2,
  },
  lineBreakdown: {
    fontSize: 12,
    lineHeight: 17,
    color: designTokens.color.ink.muted,
    marginBottom: 8,
  },
  lineMargin: {
    fontSize: 12,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    marginBottom: 8,
  },
  lineActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  adjustButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: designTokens.color.ink.accentStrong,
    backgroundColor: designTokens.color.surface.accent,
    minWidth: 80,
    alignItems: "center",
  },
  adjustButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontSize: 13,
    fontWeight: "600",
  },
  approveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: designTokens.color.ink.accentStrong,
    minWidth: 80,
    alignItems: "center",
  },
  approveButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 13,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  closeButton: {
    backgroundColor: designTokens.color.ink.danger,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: designTokens.color.ink.secondary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: designTokens.color.ink.primary,
    backgroundColor: designTokens.color.surface.canvas,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonSecondary: {
    backgroundColor: designTokens.color.surface.tertiary,
  },
  modalButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "800",
    fontSize: 14,
  },
  modalButtonTextSecondary: {
    color: designTokens.color.ink.primary,
  },
  nurseDetailModal: {
    maxHeight: "75%",
  },
  nurseDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  closeX: {
    fontSize: 14,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "600",
  },
  nurseDetailScroll: {
    flexGrow: 0,
  },
  nurseDetailSection: {
    marginTop: 20,
  },
  nurseDetailSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: 12,
  },
  nurseDetailLine: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  nurseDetailDescription: {
    fontSize: 13,
    color: designTokens.color.ink.secondary,
    marginBottom: 6,
  },
  nurseDetailAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  nurseDetailLabel: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
  },
  nurseDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
  },
  summaryValueNegative: {
    color: designTokens.color.ink.danger,
  },
});
