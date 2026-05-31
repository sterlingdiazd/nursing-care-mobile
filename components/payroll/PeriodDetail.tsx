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
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "@/src/components/shared/ToastProvider";
import { Pagination } from "@/src/components/shared/Pagination";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import type { FooterAction } from "@/src/components/navigation/AppFooter";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { designTokens } from "@/src/design-system/tokens";
import type {
  AdminPayrollPeriodDetail,
  AdminPayrollLineItem,
  DeliverPeriodVouchersResult,
} from "@/src/services/payrollService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  getPayrollPeriodExportUrl,
  getPayrollPeriodReportPdfUrl,
  getPayrollPeriodReportXlsxUrl,
  submitPayrollLineOverride,
  approvePayrollLineOverride,
  getAdminPayrollVoucherUrl,
  getAdminPayrollBulkVouchersUrl,
  getPeriodCloseWarnings,
  confirmNursePeriodPayment,
  deliverPeriodVouchers,
  markNursePaymentFailed,
  reverseNursePayment,
} from "@/src/services/payrollService";
import { getCachedAuthSession } from "@/src/services/authSession";
import { formatDateES, formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { quincenaLabel } from "@/src/utils/payrollPeriods";
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

// Voucher delivery status (separate axis from payment status): did the comprobante
// actually reach the nurse, and through which channel.
function deliveryStatusLabel(status?: string | null): string {
  switch (status) {
    case "Sent": return "Comprobante enviado";
    case "Failed": return "Error en envío";
    case "Skipped": return "Envío omitido";
    case "Pending": return "Envío pendiente";
    default: return "Pendiente";
  }
}

function deliveryStatusStyle(status?: string | null) {
  switch (status) {
    case "Sent": return styles.statusSent;
    case "Failed": return styles.statusFailed;
    case "Skipped": return styles.statusSkipped;
    default: return styles.statusPending;
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

  // Per-nurse bank-transfer confirmation (DEMO: delivery routes to the admin's own
  // email/number; nurses are not messaged yet — see the next-initiative brief).
  const [confirmingNurseId, setConfirmingNurseId] = useState<string | null>(null);
  const [confirmedNurseIds, setConfirmedNurseIds] = useState<Set<string>>(new Set());

  // Payment remediation (mark-failed / reverse) — reason-required, so it uses a modal (Alert.prompt
  // is unreliable on web). Holds the target nurse + mode while the reason modal is open.
  const [paymentAction, setPaymentAction] = useState<
    { nurseUserId: string; nurseDisplayName: string; mode: "fail" | "reverse" } | null
  >(null);
  const [paymentActionReason, setPaymentActionReason] = useState("");
  const [paymentActionSubmitting, setPaymentActionSubmitting] = useState(false);
  // Local override of the persisted paymentStatus after a remediation action (until reload).
  const [paymentStatusOverride, setPaymentStatusOverride] = useState<Record<string, string>>({});

  // Batch: confirm + deliver comprobantes to every nurse in the period at once.
  const [deliveringAll, setDeliveringAll] = useState(false);
  const [deliverResult, setDeliverResult] = useState<DeliverPeriodVouchersResult | null>(null);
  const [deliverModalVisible, setDeliverModalVisible] = useState(false);

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

  // --- Per-nurse bank-transfer confirmation (DEMO) ---
  // Confirms the transfer, then the backend emails the voucher PDF and returns a wa.me
  // link — both routed to the ADMIN's own email/number for the demo.
  const runConfirmTransfer = async (nurseUserId: string, bankReference: string | null) => {
    hapticFeedback.light();
    setConfirmingNurseId(nurseUserId);
    try {
      const result = await confirmNursePeriodPayment(period.id, nurseUserId, bankReference);
      setConfirmedNurseIds((prev) => {
        const next = new Set(prev);
        next.add(nurseUserId);
        return next;
      });
      // The backend runs a financial-validation gate before sending. If the comprobante
      // is blocked, `voucherDeliveryDetail` carries the specific reason — surface it so
      // the admin knows what to fix and retry. On success it confirms the send.
      const detail = result.voucherDeliveryDetail?.trim();
      if (result.voucherEmailSent) {
        showToast({
          variant: "success",
          message: (detail || `Comprobante enviado por correo. ${result.recipientLabel}`).trim(),
        });

        // Delivery convenience — ONLY once the validation gate passed and the backend
        // actually sent the comprobante. We never open WhatsApp or share a PDF for a
        // blocked/invalid voucher (that path takes the error branch below).
        if (result.whatsappUrl) {
          const canOpen = await Linking.canOpenURL(result.whatsappUrl).catch(() => false);
          if (canOpen) await Linking.openURL(result.whatsappUrl);
        }
        const confirmedStaff = period.staffSummary.find((s) => s.nurseUserId === nurseUserId);
        const safeName = (confirmedStaff?.nurseDisplayName ?? "enfermera")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "");
        setTimeout(async () => {
          try {
            await downloadAndShare(
              getAdminPayrollVoucherUrl(period.id, nurseUserId),
              `comprobante-${safeName}-${period.id}.pdf`,
            );
          } catch (downloadErr) {
            // Secondary share step — stay silent to avoid a second error toast.
            console.warn("Auto-share voucher failed:", downloadErr);
          }
        }, 1500);
      } else {
        showToast({
          variant: "error",
          message: (detail || `Pago confirmado, pero el comprobante no se envió. ${result.recipientLabel}`).trim(),
        });
      }
    } catch (e) {
      showToast({
        variant: "error",
        message: e instanceof Error ? e.message : "No fue posible confirmar la transferencia.",
      });
    } finally {
      setConfirmingNurseId(null);
    }
  };

  const handleConfirmTransfer = (nurseUserId: string, nurseDisplayName: string) => {
    if (confirmingNurseId) return;
    hapticFeedback.light();
    // Optional bank reference. Alert.prompt is iOS-only; elsewhere use a plain confirm.
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Confirmar transferencia",
        `Confirma el pago a ${nurseDisplayName}. Puedes anotar la referencia bancaria (opcional).`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: (ref?: string) =>
              void runConfirmTransfer(nurseUserId, ref && ref.trim() ? ref.trim() : null),
          },
        ],
        "plain-text",
        "",
      );
    } else {
      Alert.alert(
        "Confirmar transferencia",
        `¿Confirmar el pago a ${nurseDisplayName}? Se enviará el comprobante (modo demo: al administrador).`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Confirmar", onPress: () => void runConfirmTransfer(nurseUserId, null) },
        ],
      );
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

  // --- Bulk confirm + deliver comprobantes to ALL nurses in the period ---
  // The backend confirms the transfer and emails each nurse her comprobante (validated), applying
  // one shared batch bank reference, and returns a wa.me link per nurse (wa.me cannot bulk-send).
  const runDeliverAllVouchers = async (bankReference: string | null) => {
    if (deliveringAll) return;
    hapticFeedback.light();
    setDeliveringAll(true);
    try {
      const result = await deliverPeriodVouchers(period.id, bankReference);
      setDeliverResult(result);
      setDeliverModalVisible(true);
      setConfirmedNurseIds((prev) => {
        const next = new Set(prev);
        for (const item of result.items) next.add(item.nurseUserId);
        return next;
      });
      showToast({
        variant: result.failedCount === 0 ? "success" : "info",
        message: `${result.deliveredCount} de ${result.totalNurses} comprobantes enviados por correo.`,
      });
    } catch (e) {
      showToast({
        variant: "error",
        message: e instanceof Error ? e.message : "No fue posible enviar los comprobantes.",
      });
    } finally {
      setDeliveringAll(false);
    }
  };

  const handleDeliverAll = () => {
    if (deliveringAll) return;
    hapticFeedback.light();
    const nurseCount = period.staffSummary.length;
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Enviar comprobantes a todas",
        `Confirma el pago y envía su comprobante a las ${nurseCount} enfermeras del período. Puedes anotar la referencia del lote bancario (opcional).`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Enviar",
            onPress: (ref?: string) =>
              void runDeliverAllVouchers(ref && ref.trim() ? ref.trim() : null),
          },
        ],
        "plain-text",
        "",
      );
    } else {
      Alert.alert(
        "Enviar comprobantes a todas",
        `¿Confirmar el pago y enviar el comprobante a las ${nurseCount} enfermeras del período? (modo demo: al administrador).`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Enviar", onPress: () => void runDeliverAllVouchers(null) },
        ],
      );
    }
  };

  const openWhatsappLink = async (url: string) => {
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) await Linking.openURL(url);
  };

  // --- Nurse drilldown ---
  // Effective payment status for a nurse row: a same-session remediation override wins, then an
  // in-session confirm, then the persisted backend status.
  const resolvePaymentStatus = (nurseUserId: string, persisted?: string | null): string | null =>
    paymentStatusOverride[nurseUserId] ??
    (confirmedNurseIds.has(nurseUserId) ? "Confirmed" : persisted ?? null);

  const paymentBadge = (
    status: string | null,
  ): { label: string; tone: "success" | "neutral" | "warning" | "danger" | "info" } | null => {
    switch (status) {
      case "Confirmed": return { label: "Pagado", tone: "success" };
      case "SentToBank": return { label: "Enviado al banco", tone: "info" };
      case "Failed": return { label: "Fallido", tone: "danger" };
      case "Reversed": return { label: "Revertido", tone: "danger" };
      case "Pending": return { label: "Pendiente", tone: "warning" };
      default: return null;
    }
  };

  const runPaymentAction = async () => {
    if (!paymentAction || !paymentActionReason.trim() || paymentActionSubmitting) return;
    hapticFeedback.light();
    setPaymentActionSubmitting(true);
    try {
      const fn = paymentAction.mode === "reverse" ? reverseNursePayment : markNursePaymentFailed;
      const result = await fn(period.id, paymentAction.nurseUserId, paymentActionReason.trim());
      setPaymentStatusOverride((prev) => ({ ...prev, [paymentAction.nurseUserId]: result.paymentStatus }));
      setConfirmedNurseIds((prev) => {
        const next = new Set(prev);
        next.delete(paymentAction.nurseUserId); // no longer confirmed
        return next;
      });
      showToast({
        variant: "success",
        message: paymentAction.mode === "reverse" ? "Pago revertido." : "Pago marcado como fallido.",
      });
      setPaymentAction(null);
      setPaymentActionReason("");
    } catch (e) {
      showToast({ variant: "error", message: e instanceof Error ? e.message : "No fue posible actualizar el pago." });
    } finally {
      setPaymentActionSubmitting(false);
    }
  };

  const handleNursePress = (nurseUserId: string, nurseDisplayName: string) => {
    hapticFeedback.selection();
    setSelectedNurseId(nurseUserId);
    setSelectedNurseName(nurseDisplayName);
    setNurseDetailModalVisible(true);
  };

  // --- Period close (keep destructive confirmation as Alert.alert) ---
  const handleClosePeriod = async () => {
    hapticFeedback.selection();
    // Pull the authoritative pre-close warnings (unliquidated services + zero/negative net)
    // so the single confirmation lists exactly what the backend would block on.
    let warning = "";
    try {
      const w = await getPeriodCloseWarnings(period.id);
      const parts: string[] = [];
      if (w.unliquidatedServices > 0)
        parts.push(`${w.unliquidatedServices} servicio(s) completado(s) sin línea de nómina (quedarían sin pagar)`);
      if (w.negativeNetNurses > 0)
        parts.push(`${w.negativeNetNurses} enfermera(s) con pago en 0 o negativo`);
      if (parts.length > 0) warning = `\n\nAtención: ${parts.join("; ")}.`;
    } catch {
      // Fall back to the client-side net<=0 flag if the warnings call fails.
      const flagged = period.staffSummary.filter((s) => s.netCompensation <= 0);
      if (flagged.length > 0)
        warning = `\n\nAtención: ${flagged.length} enfermera(s) con pago en 0 o negativo (revisa tarifas y deducciones).`;
    }
    Alert.alert(
      "Cerrar Período",
      `Antes de cerrar (es irreversible), confirma que revisaste:\n• Deducciones y descuentos\n• Ajustes por servicio\n• Comprobantes descargados${warning}\n\n¿Cerrar "${quincenaLabel(period.startDate, period.endDate)}"?`,
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
      `¿Eliminar "${quincenaLabel(period.startDate, period.endDate)}"? Esta acción no se puede deshacer.`,
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
      if (period.staffSummary.length > 0) {
        actions.push({
          label: deliveringAll ? "Enviando…" : "Enviar a todas",
          onPress: handleDeliverAll,
          variant: "primary",
          disabled: deliveringAll,
          testID: "admin-period-deliver-all-button",
        });
      }
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
  }, [isOpen, exporting, downloadingBulk, deliveringAll, period.id, period.canModify, period.staffSummary.length, onEdit, onDelete]);

  const totalGross = period.staffSummary.reduce((sum, s) => sum + s.grossCompensation, 0);
  const totalNet = period.staffSummary.reduce((sum, s) => sum + s.netCompensation, 0);
  const statusTitle = isOpen ? "Nómina en revisión" : "Nómina cerrada";
  const statusDescription = isOpen
    ? "Puedes revisar líneas, corregir montos y cerrar el período cuando esté listo."
    : "Período finalizado. Los comprobantes y reportes están disponibles para descarga.";
  const periodLabel = quincenaLabel(period.startDate, period.endDate);
  const periodDateRange = `${formatDateES(period.startDate)} – ${formatDateES(period.endDate)}`;
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
              <Text style={styles.overviewEyebrow}>{periodLabel}</Text>
              <Text style={styles.overviewTitle}>{statusTitle}</Text>
              <Text style={styles.overviewPeriod}>{periodDateRange}</Text>
            </View>
            <StatusBadge
              label={isOpen ? "Abierto" : "Cerrado"}
              tone={isOpen ? "success" : "neutral"}
              testID={adminTestIds.payroll.periodStatusBadge}
            />
          </View>

          <Text style={styles.overviewDescription}>{statusDescription}</Text>

          {period.reopenedAtUtc && (
            <View style={styles.reopenNotice} testID="payroll-period-reopen-notice">
              <Text style={styles.reopenNoticeText}>
                Reabierto el {formatDateTimeES(period.reopenedAtUtc)}
                {period.reopenCount > 1 ? ` (${period.reopenCount} veces)` : ""}
                {period.reopenReason ? ` — ${period.reopenReason}` : ""}
              </Text>
            </View>
          )}

          <View style={styles.netPanel}>
            <Text style={styles.netLabel}>Total neto a pagar</Text>
            <Text style={styles.netValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(totalNet)}
            </Text>
            <Text style={styles.netSupporting}>
              Bruto {formatCurrency(totalGross)} • {lineCountLabel} • {nurseCountLabel}
            </Text>
          </View>

          {period.totalCollected != null || period.totalBilled != null ? (
            <View style={styles.reconPanel} testID="period-reconciliation">
              <Text style={styles.reconTitle}>Conciliación cliente → nómina</Text>
              <View style={styles.reconRow}>
                <Text style={styles.reconLabel}>Cobrado de clientes</Text>
                <Text style={styles.reconValue}>{formatCurrency(period.totalCollected ?? 0)}</Text>
              </View>
              <View style={styles.reconRow}>
                <Text style={styles.reconLabel}>Facturado a clientes</Text>
                <Text style={styles.reconValue}>{formatCurrency(period.totalBilled ?? 0)}</Text>
              </View>
              <View style={styles.reconRow}>
                <Text style={styles.reconLabel}>A pagar a enfermeras</Text>
                <Text style={styles.reconValue}>{formatCurrency(period.totalNetPayout ?? totalNet)}</Text>
              </View>
              {(period.totalCollected ?? 0) < (period.totalNetPayout ?? totalNet) ? (
                <Text style={styles.reconWarning} testID="period-reconciliation-warning">
                  Cobrado menor que lo que pagarás a enfermeras — verifica los pagos de clientes.
                </Text>
              ) : null}
            </View>
          ) : null}

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
                {staff.bankReference ? (
                  <Text style={styles.staffSourceText}>
                    Fuente de pago: referencia bancaria {staff.bankReference}
                  </Text>
                ) : (
                  <Text style={styles.staffSourceText}>
                    Fuente: líneas de nómina del período
                  </Text>
                )}
                {(() => {
                  const badge = paymentBadge(resolvePaymentStatus(staff.nurseUserId, staff.paymentStatus));
                  return badge ? (
                    <View style={styles.staffBadgeRow}>
                      <StatusBadge
                        label={badge.label}
                        tone={badge.tone}
                        testID={`admin-staff-payment-status-${staff.nurseUserId}`}
                      />
                    </View>
                  ) : null;
                })()}
                {(staff.paymentConfirmedAtUtc || confirmedNurseIds.has(staff.nurseUserId)) && staff.deliveryStatus ? (
                  <View style={styles.deliveryBadge} testID={`delivery-status-${staff.nurseUserId}`}>
                    <Text style={[styles.deliveryStatusText, deliveryStatusStyle(staff.deliveryStatus)]}>
                      • {deliveryStatusLabel(staff.deliveryStatus)}
                      {staff.deliveryChannel ? ` (${staff.deliveryChannel})` : ""}
                    </Text>
                  </View>
                ) : null}
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
                  <Pressable
                    style={[
                      styles.confirmTransferButton,
                      (confirmingNurseId === staff.nurseUserId ||
                        Boolean(staff.paymentConfirmedAtUtc) ||
                        confirmedNurseIds.has(staff.nurseUserId)) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={() => handleConfirmTransfer(staff.nurseUserId, staff.nurseDisplayName)}
                    disabled={
                      confirmingNurseId === staff.nurseUserId ||
                      Boolean(staff.paymentConfirmedAtUtc) ||
                      confirmedNurseIds.has(staff.nurseUserId)
                    }
                    testID={`admin-staff-confirm-transfer-${staff.nurseUserId}`}
                    nativeID={`admin-staff-confirm-transfer-${staff.nurseUserId}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Confirmar transferencia de ${staff.nurseDisplayName}`}
                    accessibilityState={{
                      busy: confirmingNurseId === staff.nurseUserId,
                      disabled: Boolean(staff.paymentConfirmedAtUtc) || confirmedNurseIds.has(staff.nurseUserId),
                    }}
                  >
                    {confirmingNurseId === staff.nurseUserId ? (
                      <ActivityIndicator color={designTokens.color.surface.primary} size="small" accessibilityLabel="Confirmando..." />
                    ) : (
                      <Text style={styles.confirmTransferButtonText}>
                        {staff.paymentConfirmedAtUtc || confirmedNurseIds.has(staff.nurseUserId) ? "Transferencia confirmada" : "Confirmar transferencia"}
                      </Text>
                    )}
                  </Pressable>
                  {(() => {
                    const st = resolvePaymentStatus(staff.nurseUserId, staff.paymentStatus);
                    if (st !== "Confirmed" && st !== "SentToBank") return null;
                    return (
                      <View style={styles.remediationRow}>
                        {st === "Confirmed" ? (
                          <Pressable
                            style={styles.remediationButton}
                            onPress={() => {
                              hapticFeedback.selection();
                              setPaymentActionReason("");
                              setPaymentAction({ nurseUserId: staff.nurseUserId, nurseDisplayName: staff.nurseDisplayName, mode: "reverse" });
                            }}
                            testID={`admin-staff-reverse-${staff.nurseUserId}`}
                            nativeID={`admin-staff-reverse-${staff.nurseUserId}`}
                            accessibilityRole="button"
                            accessibilityLabel={`Revertir pago de ${staff.nurseDisplayName}`}
                          >
                            <Text style={styles.remediationButtonText}>Revertir</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          style={styles.remediationButton}
                          onPress={() => {
                            hapticFeedback.selection();
                            setPaymentActionReason("");
                            setPaymentAction({ nurseUserId: staff.nurseUserId, nurseDisplayName: staff.nurseDisplayName, mode: "fail" });
                          }}
                          testID={`admin-staff-mark-failed-${staff.nurseUserId}`}
                          nativeID={`admin-staff-mark-failed-${staff.nurseUserId}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Marcar como fallido el pago de ${staff.nurseDisplayName}`}
                        >
                          <Text style={styles.remediationButtonText}>Marcar fallido</Text>
                        </Pressable>
                      </View>
                    );
                  })()}
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
              const sourceCareRequestId = line.careRequestId;
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
                  <Text style={styles.sourceText}>
                    Fuente: {sourceCareRequestId ? "solicitud de cuidado" : "ejecución de servicio"}
                  </Text>
                  {sourceCareRequestId ? (
                    <Pressable
                      onPress={() => {
                        hapticFeedback.selection();
                        router.push(`/admin/care-requests/${sourceCareRequestId}` as never);
                      }}
                      style={({ pressed }) => [styles.sourceLinkButton, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Abrir solicitud que originó esta línea"
                      testID={`payroll-line-source-${line.id}`}
                      nativeID={`payroll-line-source-${line.id}`}
                    >
                      <Text style={styles.sourceLinkButtonText}>Abrir solicitud fuente</Text>
                    </Pressable>
                  ) : null}
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

      {/* Bulk delivery result modal */}
      <Modal
        visible={deliverModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeliverModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, styles.nurseDetailModal]}
            testID="admin-deliver-all-panel"
            nativeID="admin-deliver-all-panel"
            accessibilityViewIsModal
          >
            <View style={styles.nurseDetailHeader}>
              <Text style={styles.modalTitle}>Comprobantes enviados</Text>
              <Pressable
                onPress={() => {
                  hapticFeedback.selection();
                  setDeliverModalVisible(false);
                }}
                testID="admin-deliver-all-close-button"
                nativeID="admin-deliver-all-close-button"
                accessibilityRole="button"
                accessibilityLabel="Cerrar resultado de envío"
              >
                <Text style={styles.closeX}>Cerrar</Text>
              </Pressable>
            </View>

            {deliverResult ? (
              <>
                <Text style={styles.deliverSummary}>
                  {deliverResult.deliveredCount} de {deliverResult.totalNurses} enviados por correo
                  {deliverResult.failedCount > 0 ? ` · ${deliverResult.failedCount} con problema` : ""}
                </Text>
                <Text style={styles.deliverHint}>
                  Toca “WhatsApp” para avisar a cada enfermera (no se puede enviar en lote).
                </Text>
                <ScrollView style={styles.nurseDetailScroll}>
                  {deliverResult.items.map((item) => (
                    <View key={item.nurseUserId} style={styles.deliverRow}>
                      <View style={styles.deliverRowInfo}>
                        <Text style={styles.deliverNurseName} numberOfLines={1}>
                          {item.nurseDisplayName}
                        </Text>
                        <Text
                          style={[
                            styles.deliverStatus,
                            item.voucherEmailSent ? styles.summaryValueGreen : styles.summaryValueNegative,
                          ]}
                          numberOfLines={2}
                        >
                          {item.voucherEmailSent ? "Correo enviado" : item.voucherDeliveryDetail || "No enviado"}
                        </Text>
                      </View>
                      {item.whatsappUrl ? (
                        <Pressable
                          onPress={() => void openWhatsappLink(item.whatsappUrl)}
                          style={styles.whatsappPill}
                          accessibilityRole="button"
                          accessibilityLabel={`Enviar WhatsApp a ${item.nurseDisplayName}`}
                        >
                          <Text style={styles.whatsappPillText}>WhatsApp</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>


      <Modal
        visible={paymentAction !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentAction(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={styles.modalCard}
            testID="admin-payment-action-modal"
            nativeID="admin-payment-action-modal"
            accessibilityViewIsModal
          >
            <Text style={styles.modalTitle}>
              {paymentAction?.mode === "reverse" ? "Revertir pago" : "Marcar pago como fallido"}
            </Text>
            <Text style={styles.modalSubtitle} numberOfLines={2}>
              {(paymentAction?.nurseDisplayName ?? "") + " — " + (paymentAction?.mode === "reverse"
                ? "el pago volverá a Pendiente y se le avisará a la enfermera."
                : "el pago quedará marcado como no realizado.")}
            </Text>

            <Text style={styles.inputLabel}>Motivo</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              multiline
              value={paymentActionReason}
              onChangeText={setPaymentActionReason}
              placeholder="Describe el motivo..."
              testID="admin-payment-action-reason-input"
              nativeID="admin-payment-action-reason-input"
              accessibilityLabel="Motivo de la acción de pago"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => { hapticFeedback.selection(); setPaymentAction(null); }}
                disabled={paymentActionSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Cancelar</Text>
              </TouchableOpacity>
              <Pressable
                style={[styles.modalButton, (paymentActionSubmitting || !paymentActionReason.trim()) && styles.buttonDisabled]}
                onPress={runPaymentAction}
                disabled={paymentActionSubmitting || !paymentActionReason.trim()}
                testID="admin-payment-action-submit-button"
                nativeID="admin-payment-action-submit-button"
                accessibilityRole="button"
                accessibilityLabel="Confirmar acción de pago"
                accessibilityState={{ busy: paymentActionSubmitting }}
              >
                {paymentActionSubmitting ? (
                  <ActivityIndicator color={designTokens.color.ink.inverse} size="small" accessibilityLabel="Cargando..." />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {paymentAction?.mode === "reverse" ? "Revertir" : "Marcar fallido"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.color.surface.primary,
  },
  deliverSummary: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.xs,
  },
  deliverHint: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.sm,
  },
  deliverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: designTokens.color.border.subtle,
  },
  deliverRowInfo: { flex: 1 },
  deliverNurseName: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  deliverStatus: { fontSize: designTokens.typography.caption.fontSize, marginTop: designTokens.spacing.xs },
  whatsappPill: {
    backgroundColor: "#25D366",
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.radius.pill,
  },
  whatsappPillText: { color: designTokens.color.ink.inverse, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800" },
  scrollContent: {
    // Clearance for the bubbled-up footer action bar (was 112; the codemod's
    // spacing scale tops out at huge/40, which clipped the last row).
    paddingBottom: designTokens.layout.scrollBottomGap,
  },
  hiddenMarker: {
    height: 0,
    width: 0,
    opacity: 0,
  },
  errorToast: {
    marginHorizontal: designTokens.spacing.lg,
    marginTop: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.surface.danger,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  errorToastText: {
    color: designTokens.color.status.dangerText,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "600",
  },
  overviewCard: {
    marginHorizontal: designTokens.spacing.lg,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: designTokens.spacing.md,
  },
  overviewTitleGroup: {
    flex: 1,
  },
  overviewEyebrow: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    letterSpacing: 0,
    color: designTokens.color.ink.muted,
    textTransform: "uppercase",
    marginBottom: designTokens.spacing.xs,
  },
  overviewTitle: {
    fontSize: designTokens.typography.title.fontSize,
    lineHeight: 26,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  overviewPeriod: {
    marginTop: designTokens.spacing.xs,
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.secondary,
    fontWeight: "600",
  },
  overviewDescription: {
    marginTop: designTokens.spacing.md,
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.label.fontSize,
    lineHeight: 19,
  },
  reopenNotice: {
    marginTop: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.warning,
  },
  reopenNoticeText: {
    fontSize: designTokens.typography.caption.fontSize,
    lineHeight: 17,
    color: designTokens.color.status.warningText,
    fontWeight: "600",
  },
  netPanel: {
    marginTop: designTokens.spacing.lg,
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.success,
  },
  netLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.xs,
  },
  netValue: {
    fontSize: designTokens.typography.display.fontSize,
    lineHeight: 32,
    fontWeight: "800",
    color: designTokens.color.status.successText,
  },
  netSupporting: {
    marginTop: designTokens.spacing.xs,
    fontSize: designTokens.typography.caption.fontSize,
    lineHeight: 17,
    color: designTokens.color.ink.secondary,
  },
  reconPanel: {
    marginTop: designTokens.spacing.md,
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.color.surface.secondary,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  reconTitle: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.sm,
    letterSpacing: 0.3,
  },
  reconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: designTokens.spacing.xs,
  },
  reconLabel: { fontSize: designTokens.typography.label.fontSize, color: designTokens.color.ink.secondary },
  reconValue: { fontSize: designTokens.typography.body.fontSize, fontWeight: "700", color: designTokens.color.ink.primary },
  reconWarning: { marginTop: designTokens.spacing.sm, fontSize: designTokens.typography.caption.fontSize, fontWeight: "700", color: designTokens.color.status.dangerText },
  timelineGrid: {
    marginTop: designTokens.spacing.md,
    flexDirection: "row",
    gap: designTokens.spacing.sm,
  },
  timelineItem: {
    flex: 1,
    minHeight: 62,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.surface.secondary,
  },
  headerActions: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.xs,
  },
  headerActionButton: {
    flex: 1,
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
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
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "600",
  },
  headerActionButtonTextSecondary: {
    color: designTokens.color.ink.accentStrong,
  },
  metaLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.xs,
  },
  metaValue: {
    fontSize: designTokens.typography.label.fontSize,
    lineHeight: 17,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  summarySection: {
    padding: designTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  sectionTitle: {
    fontSize: designTokens.typography.section.fontSize,
    lineHeight: 23,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  sectionHeader: {
    marginBottom: designTokens.spacing.md,
  },
  sectionSubtitle: {
    marginTop: designTokens.spacing.xs,
    fontSize: designTokens.typography.label.fontSize,
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
    paddingHorizontal: designTokens.spacing.xs,
  },
  summaryLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.xs,
  },
  summaryValue: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "bold",
    color: designTokens.color.ink.primary,
  },
  summaryValueGreen: {
    color: designTokens.color.status.successText,
  },
  staffSection: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.xs,
    paddingBottom: designTokens.spacing.lg,
  },
  emptyState: {
    padding: designTokens.spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.muted,
  },
  staffItem: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  staffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: designTokens.spacing.xs,
    alignItems: "center",
  },
  staffName: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  staffNameTappable: {
    color: designTokens.color.ink.accentStrong,
    textDecorationLine: "underline",
  },
  staffNet: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "800",
    color: designTokens.color.status.successText,
  },
  staffDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  },
  staffInfo: {
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.muted,
  },
  staffSourceText: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "700",
    marginBottom: designTokens.spacing.sm,
  },
  staffActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: designTokens.spacing.sm,
  },
  staffBadgeRow: {
    flexDirection: "row",
    marginTop: designTokens.spacing.sm,
  },
  remediationRow: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
    width: "100%",
    justifyContent: "flex-end",
    marginTop: designTokens.spacing.xs,
  },
  remediationButton: {
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    borderWidth: 1,
    borderColor: designTokens.color.status.dangerText,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center",
  },
  remediationButtonText: {
    color: designTokens.color.status.dangerText,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
  },
  voucherButton: {
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    borderWidth: 1,
    borderColor: designTokens.color.ink.accentStrong,
    backgroundColor: designTokens.color.surface.primary,
    minWidth: 170,
    alignItems: "center",
  },
  voucherButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "600",
  },
  confirmTransferButton: {
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    borderWidth: 1,
    borderColor: designTokens.color.ink.accentStrong,
    backgroundColor: designTokens.color.ink.accentStrong,
    minWidth: 170,
    alignItems: "center",
  },
  confirmTransferButtonText: {
    color: designTokens.color.surface.primary,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "600",
  },
  linesSection: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
  },
  lineItem: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: designTokens.spacing.xs,
    alignItems: "center",
  },
  lineName: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    flex: 1,
    marginRight: designTokens.spacing.sm,
  },
  lineNet: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.status.successText,
  },
  lineServiceBlock: {
    marginTop: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.md,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  lineEyebrow: {
    fontSize: designTokens.typography.caption.fontSize,
    lineHeight: 13,
    fontWeight: "800",
    color: designTokens.color.ink.muted,
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: designTokens.spacing.xs,
  },
  lineServiceName: {
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 19,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  sourceText: {
    color: designTokens.color.ink.accentStrong,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    marginTop: designTokens.spacing.xs,
  },
  sourceLinkButton: {
    alignSelf: "flex-start",
    marginTop: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
    borderRadius: designTokens.radius.sm,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.color.surface.accent,
  },
  sourceLinkButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
  },
  lineFactsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.md,
  },
  lineFactCell: {
    minWidth: 108,
    flexGrow: 1,
    flexBasis: "31%",
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  lineFactLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    lineHeight: 13,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.xs,
  },
  lineFactValue: {
    fontSize: designTokens.typography.caption.fontSize,
    lineHeight: 16,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  lineFactValueStrong: {
    color: designTokens.color.status.successText,
  },
  lineDescription: {
    fontSize: designTokens.typography.label.fontSize,
    lineHeight: 18,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.xs,
  },
  lineBreakdown: {
    fontSize: designTokens.typography.caption.fontSize,
    lineHeight: 17,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.sm,
  },
  lineMargin: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.sm,
  },
  lineActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  adjustButton: {
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    borderWidth: 1,
    borderColor: designTokens.color.ink.accentStrong,
    backgroundColor: designTokens.color.surface.accent,
    minWidth: 80,
    alignItems: "center",
  },
  adjustButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "600",
  },
  approveButton: {
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.ink.accentStrong,
    minWidth: 80,
    alignItems: "center",
  },
  approveButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actions: {
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.md,
  },
  closeButton: {
    backgroundColor: designTokens.color.ink.danger,
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.radius.sm,
    alignItems: "center",
  },
  closeButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: designTokens.spacing.xl,
  },
  modalCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
  },
  modalTitle: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.xs,
  },
  modalSubtitle: {
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.lg,
  },
  inputLabel: {
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.xs,
    marginTop: designTokens.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.sm,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    fontSize: designTokens.typography.body.fontSize,
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
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.lg,
  },
  modalButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    borderRadius: designTokens.radius.sm,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonSecondary: {
    backgroundColor: designTokens.color.surface.tertiary,
  },
  modalButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "800",
    fontSize: designTokens.typography.body.fontSize,
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
    marginBottom: designTokens.spacing.md,
  },
  closeX: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "600",
  },
  nurseDetailScroll: {
    flexGrow: 0,
  },
  nurseDetailSection: {
    marginTop: designTokens.spacing.xl,
  },
  nurseDetailSectionTitle: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.md,
  },
  nurseDetailLine: {
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  nurseDetailDescription: {
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.sm,
  },
  nurseDetailAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: designTokens.spacing.xs,
  },
  nurseDetailLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.muted,
  },
  nurseDetailValue: {
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
  },
  summaryValueNegative: {
    color: designTokens.color.ink.danger,
  },
  pressed: { opacity: 0.78 },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: designTokens.spacing.xs,
    gap: designTokens.spacing.xs,
  },
  deliveryStatusText: {
    fontSize: designTokens.typography.caption.fontSize,
    lineHeight: 14,
    fontWeight: "700",
  },
  statusPending: { color: designTokens.color.ink.muted },
  statusSent: { color: designTokens.color.status.successText },
  statusFailed: { color: designTokens.color.status.dangerText },
  statusSkipped: { color: designTokens.color.ink.secondary },
});
