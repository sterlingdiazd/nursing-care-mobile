import { useState } from "react";
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
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { designTokens } from "@/src/design-system/tokens";
import type { AdminPayrollPeriodDetail, AdminPayrollLineItem } from "@/src/services/payrollService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  getPayrollPeriodExportUrl,
  submitPayrollLineOverride,
  approvePayrollLineOverride,
  getAdminPayrollVoucherUrl,
  getAdminPayrollBulkVouchersUrl,
} from "@/src/services/payrollService";
import { getCachedAuthSession } from "@/src/services/authSession";
import { formatDateES, formatDateTimeES } from "@/src/utils/spanishTextValidator";

interface PeriodDetailProps {
  period: AdminPayrollPeriodDetail;
  onClose: () => Promise<void>;
  onBack: () => void;
  onPrepareRecalculate?: () => void;
}

async function downloadAndShare(url: string, filename: string): Promise<"shared" | "unavailable"> {
  const session = getCachedAuthSession();
  const token = session?.token;
  if (!token) {
    throw new Error("No hay sesion activa.");
  }
  const fileUri = (FileSystem as any).documentDirectory + filename;
  const downloadRes = await (FileSystem as any).downloadAsync(url, fileUri, {
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
    throw new Error("No fue posible descargar el archivo.");
  }
}

export function PeriodDetail({ period, onClose, onBack, onPrepareRecalculate }: PeriodDetailProps) {
  const { showToast } = useToast();
  const isOpen = period.status === "Open";

  // CSV export state
  const [exporting, setExporting] = useState(false);

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

  // Nurse detail drilldown modal state
  const [nurseDetailModalVisible, setNurseDetailModalVisible] = useState(false);
  const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
  const [selectedNurseName, setSelectedNurseName] = useState<string>("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);

  // --- CSV Export ---
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const url = getPayrollPeriodExportUrl(period.id);
      const filename = `nomina-${period.id}-${Date.now()}.csv`;
      const result = await downloadAndShare(url, filename);
      if (result === "unavailable") {
        showToast({ variant: "info", message: "Archivo descargado pero compartir no está disponible." });
      }
    } catch (e) {
      showToast({ variant: "error", message: e instanceof Error ? e.message : "No fue posible exportar el período." });
    } finally {
      setExporting(false);
    }
  };

  // --- Override modal ---
  const openOverrideModal = (line: AdminPayrollLineItem) => {
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
    Alert.alert(
      "Aprobar ajuste",
      "¿Confirmar la aprobacion del ajuste pendiente?",
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
    setSelectedNurseId(nurseUserId);
    setSelectedNurseName(nurseDisplayName);
    setNurseDetailModalVisible(true);
  };

  // --- Period close (keep destructive confirmation as Alert.alert) ---
  const handleClosePeriod = () => {
    Alert.alert(
      "Cerrar Período",
      `¿Estas seguro de cerrar el período "${period.startDate} - ${period.endDate}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Período",
          style: "destructive",
          onPress: async () => {
            try {
              await onClose();
            } catch {
              showToast({ variant: "error", message: "No fue posible cerrar el período." });
            }
          },
        },
      ]
    );
  };

  const totalGross = period.staffSummary.reduce((sum, s) => sum + s.grossCompensation, 0);
  const totalNet = period.staffSummary.reduce((sum, s) => sum + s.netCompensation, 0);

  const nurseLines = selectedNurseId
    ? period.lines.filter((l) => l.nurseUserId === selectedNurseId)
    : [];
  const nurseDeductionLines = nurseLines.filter((line) => line.deductionsTotal > 0);

  return (
    <>
      <ScrollView
        style={styles.container}
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

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver a la lista de períodos"
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>

          <View style={styles.reviewBanner}>
            <Text style={styles.reviewEyebrow}>Revision operativa</Text>
            <Text style={styles.reviewTitle}>Periodo listo para decision financiera</Text>
            <Text style={styles.reviewDescription}>
              Revisa el estado, los totales y las consecuencias antes de cerrar el periodo o recalcular la nomina.
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.dates}>
              {period.startDate} - {period.endDate}
            </Text>
            <View
              style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}
              testID={adminTestIds.payroll.periodStatusBadge}
              nativeID={adminTestIds.payroll.periodStatusBadge}
            >
              <Text
                style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}
                testID="payroll-period-status-badge"
                nativeID="payroll-period-status-badge"
              >
                {isOpen ? "Abierto" : "Cerrado"}
              </Text>
            </View>
          </View>

          {/* Header action bar: CSV export + bulk vouchers */}
          <View style={styles.headerActions}>
            {isOpen && onPrepareRecalculate ? (
              <Pressable
                style={[styles.headerActionButton, styles.headerActionButtonWarning]}
                onPress={onPrepareRecalculate}
                accessibilityRole="button"
                accessibilityLabel="Preparar recálculo de nómina"
              >
                <Text style={styles.headerActionButtonText}>Preparar recálculo</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.headerActionButton, exporting && styles.buttonDisabled]}
              onPress={handleExport}
              disabled={exporting}
              testID="admin-period-export-csv-button"
              nativeID="admin-period-export-csv-button"
              accessibilityRole="button"
              accessibilityLabel={exporting ? "Exportando CSV" : "Exportar período como CSV"}
              accessibilityState={{ busy: exporting }}
            >
              {exporting ? (
                <ActivityIndicator color={designTokens.color.ink.inverse} size="small" accessibilityLabel="Cargando..." />
              ) : (
                <Text style={styles.headerActionButtonText}>Exportar CSV</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.headerActionButton, styles.headerActionButtonSecondary, downloadingBulk && styles.buttonDisabled]}
              onPress={handleDownloadAllVouchers}
              disabled={downloadingBulk}
              testID="admin-period-bulk-vouchers-button"
              nativeID="admin-period-bulk-vouchers-button"
              accessibilityRole="button"
              accessibilityLabel={downloadingBulk ? "Descargando comprobantes" : "Descargar todos los comprobantes"}
              accessibilityState={{ busy: downloadingBulk }}
            >
              {downloadingBulk ? (
                <ActivityIndicator color={designTokens.color.ink.accentStrong} size="small" accessibilityLabel="Cargando..." />
              ) : (
                <Text style={[styles.headerActionButtonText, styles.headerActionButtonTextSecondary]}>
                  Descargar todos
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Corte</Text>
              <Text style={styles.metaValue}>{formatDateES(period.cutoffDate)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Pago</Text>
              <Text style={styles.metaValue}>{formatDateES(period.paymentDate)}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Creado</Text>
              <Text style={styles.metaValue}>{formatDateTimeES(period.createdAtUtc)}</Text>
            </View>
            {period.closedAtUtc && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Cerrado</Text>
                <Text style={styles.metaValue}>{period.closedAtUtc ? formatDateTimeES(period.closedAtUtc) : ""}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary totals */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Resumen Total</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Líneas</Text>
              <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{period.lines.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Bruto</Text>
              <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(totalGross)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Neto</Text>
              <Text style={[styles.summaryValue, styles.summaryValueGreen]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(totalNet)}</Text>
            </View>
          </View>
        </View>

        {/* Staff summary — tappable names + voucher download */}
        <View
          style={styles.staffSection}
          testID="payroll-nurse-summary-table"
          nativeID="payroll-nurse-summary-table"
        >
          <Text style={styles.sectionTitle}>
            Resumen por Enfermera ({period.staffSummary.length})
          </Text>

          {period.staffSummary.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay nurses en este período</Text>
            </View>
          ) : (
            period.staffSummary.map((staff) => (
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
                      <Text style={styles.voucherButtonText}>Comprobante</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Per-line override section */}
        {period.lines.length > 0 && (
          <View
            style={styles.linesSection}
            testID="payroll-lines-table"
            nativeID="payroll-lines-table"
          >
            <Text style={styles.sectionTitle}>Líneas de Nómina ({period.lines.length})</Text>
            {period.lines.map((line) => (
              <View key={line.id} style={styles.lineItem}>
                <View style={styles.lineHeader}>
                  <Text style={styles.lineName} numberOfLines={1}>
                    {line.nurseDisplayName}
                  </Text>
                  <Text style={styles.lineNet}>{formatCurrency(line.netCompensation)}</Text>
                </View>
                <Text style={styles.lineDescription} numberOfLines={2}>
                  {line.description}
                </Text>
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
              </View>
            ))}
          </View>
        )}

        {/* Bottom actions */}
        <View style={styles.actions}>
          {isOpen && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClosePeriod}
              accessibilityRole="button"
              accessibilityLabel="Cerrar este período de nómina"
            >
              <Text style={styles.closeButtonText}>Cerrar Período</Text>
            </TouchableOpacity>
          )}
        </View>
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
                {overrideLine.nurseDisplayName} — {overrideLine.description}
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
                onPress={() => setOverrideModalVisible(false)}
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
                onPress={() => setNurseDetailModalVisible(false)}
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
                        {line.description}
                      </Text>
                      <View style={styles.nurseDetailAmounts}>
                        <Text style={styles.nurseDetailLabel}>Base:</Text>
                        <Text style={styles.nurseDetailValue}>
                          {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(line.baseCompensation)}
                        </Text>
                      </View>
                      <View style={styles.nurseDetailAmounts}>
                        <Text style={styles.nurseDetailLabel}>Neto:</Text>
                        <Text style={[styles.nurseDetailValue, styles.summaryValueGreen]}>
                          {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(line.netCompensation)}
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
                        {line.description}
                      </Text>
                      <View style={styles.nurseDetailAmounts}>
                        <Text style={styles.nurseDetailLabel}>Deducción:</Text>
                        <Text style={[styles.nurseDetailValue, styles.summaryValueNegative]}>
                          {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(line.deductionsTotal)}
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 15,
    color: designTokens.color.ink.accentStrong,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dates: {
    fontSize: 18,
    fontWeight: "bold",
    color: designTokens.color.ink.primary,
    flex: 1,
    marginRight: 8,
  },
  reviewBanner: {
    backgroundColor: designTokens.color.status.infoBg,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  reviewEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: designTokens.color.ink.accentStrong,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  reviewDescription: {
    marginTop: 6,
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  statusOpen: {
    backgroundColor: designTokens.color.surface.accent,
  },
  statusClosed: {
    backgroundColor: designTokens.color.surface.secondary,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusTextOpen: {
    color: designTokens.color.ink.accentStrong,
  },
  statusTextClosed: {
    color: designTokens.color.ink.muted,
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
  metaSection: {
    padding: 16,
    backgroundColor: designTokens.color.surface.canvas,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    color: designTokens.color.ink.primary,
  },
  summarySection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
    marginBottom: 12,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
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
    backgroundColor: designTokens.color.surface.canvas,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  staffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    alignItems: "center",
  },
  staffName: {
    fontSize: 15,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
  },
  staffNameTappable: {
    color: designTokens.color.ink.accentStrong,
    textDecorationLine: "underline",
  },
  staffNet: {
    fontSize: 15,
    fontWeight: "bold",
    color: designTokens.color.status.successText,
  },
  staffDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  staffInfo: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
  },
  staffActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  voucherButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: designTokens.color.ink.accentStrong,
    backgroundColor: designTokens.color.surface.success,
    minWidth: 90,
    alignItems: "center",
  },
  voucherButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontSize: 13,
    fontWeight: "600",
  },
  linesSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
  },
  lineItem: {
    backgroundColor: designTokens.color.surface.canvas,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    alignItems: "center",
  },
  lineName: {
    fontSize: 14,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
    flex: 1,
    marginRight: 8,
  },
  lineNet: {
    fontSize: 14,
    fontWeight: "bold",
    color: designTokens.color.status.successText,
  },
  lineDescription: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
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
