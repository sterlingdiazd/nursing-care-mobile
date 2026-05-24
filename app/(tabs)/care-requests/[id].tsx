import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import type { FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { logClientEvent } from "@/src/logging/clientLogger";
import {
  assignCareRequestNurse,
  getActiveNurseProfiles,
  getCareRequestById,
  reportPayment,
  transitionCareRequest,
  type ActiveNurseProfileSummary,
} from "@/src/services/careRequestService";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { careRequestTestIds } from "@/src/testing/testIds";
import { CareRequestDto, CareRequestTransitionAction } from "@/src/types/careRequest";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { formatDOP } from "@/src/utils/currency";
import { hapticFeedback } from "@/src/utils/haptics";

function getStatusPalette(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved":
      return {
        bg: designTokens.color.surface.success,
        fg: designTokens.color.status.successText,
        rail: designTokens.color.status.successText,
      };
    case "Rejected":
      return {
        bg: designTokens.color.surface.danger,
        fg: designTokens.color.status.dangerText,
        rail: designTokens.color.status.dangerText,
      };
    case "Completed":
    case "Invoiced":
      return {
        bg: designTokens.color.status.infoBg,
        fg: designTokens.color.ink.accentStrong,
        rail: designTokens.color.ink.accentStrong,
      };
    case "Paid":
      return {
        bg: designTokens.color.surface.success,
        fg: designTokens.color.status.successText,
        rail: designTokens.color.status.successText,
      };
    case "Cancelled":
    case "Voided":
      return {
        bg: designTokens.color.surface.secondary,
        fg: designTokens.color.ink.secondary,
        rail: designTokens.color.ink.muted,
      };
    default:
      return {
        bg: designTokens.color.surface.warning,
        fg: designTokens.color.status.warningText,
        rail: designTokens.color.status.warningText,
      };
  }
}

function getStatusLabel(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved": return "Aprobada";
    case "Rejected": return "Rechazada";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    case "Invoiced": return "Facturada";
    case "PaymentReported": return "Pago reportado";
    case "Paid": return "Pagada";
    case "Voided": return "Anulada";
    default: return "Pendiente";
  }
}

function formatCurrency(value: number | null | undefined) {
  return value != null ? `RD$ ${value.toLocaleString("es-DO", { minimumFractionDigits: 2 })}` : "N/A";
}

function formatFactor(value: number | null | undefined) {
  return value != null ? value.toFixed(4) : "N/A";
}

function formatPercent(value: number | null | undefined) {
  return value != null ? `${value}%` : "N/A";
}

function buildNurseLabel(nurse: ActiveNurseProfileSummary) {
  return [nurse.name, nurse.lastName].filter(Boolean).join(" ") || nurse.email;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function CareRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { roles, userId } = useAuth();
  const [careRequest, setCareRequest] = useState<CareRequestDto | null>(null);
  const [activeNurses, setActiveNurses] = useState<ActiveNurseProfileSummary[]>([]);
  const [assignedNurseId, setAssignedNurseId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pricingSheetVisible, setPricingSheetVisible] = useState(false);
  const [assignmentSheetVisible, setAssignmentSheetVisible] = useState(false);
  const [overflowSheetVisible, setOverflowSheetVisible] = useState(false);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [nurseSearchQuery, setNurseSearchQuery] = useState("");

  const loadCareRequest = async () => {
    if (!id) return;
    setError(null);
    try {
      const response = await getCareRequestById(id);
      setCareRequest(response);
      setAssignedNurseId(response.assignedNurse ?? "");
      logClientEvent("mobile.ui", "Care request detail loaded", { id });
    } catch (nextError: any) {
      setError(nextError.message ?? "No fue posible cargar la solicitud.");
      logClientEvent("mobile.ui", "Care request detail failed",
        { id, message: nextError.message ?? "Unknown error" }, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadCareRequest(); }, [id]);

  const runReportPayment = async (imageUri: string, mimeType: string, note: string) => {
    if (!id) return;
    setIsActing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await reportPayment(id, imageUri, mimeType, note);
      setPaymentSheetVisible(false);
      setSuccessMessage("Pago reportado. La administración verificará el comprobante y confirmará la recepción.");
      await loadCareRequest();
    } catch (nextError: any) {
      hapticFeedback.error();
      setError(nextError?.message ?? "No se pudo reportar el pago.");
    } finally {
      setIsActing(false);
    }
  };

  useEffect(() => {
    if (!roles.includes("ADMIN")) {
      setActiveNurses([]);
      return;
    }
    void getActiveNurseProfiles().then(setActiveNurses).catch(() => setActiveNurses([]));
  }, [roles]);

  const sortedNurses = useMemo(
    () => [...activeNurses].sort((a, b) => buildNurseLabel(a).localeCompare(buildNurseLabel(b), "es")),
    [activeNurses],
  );

  const filteredNurses = useMemo(() => {
    const query = normalizeSearchValue(nurseSearchQuery);
    if (!query) return sortedNurses;
    return sortedNurses.filter((n) =>
      [buildNurseLabel(n), n.email, n.specialty ?? "", n.category ?? ""].some((v) =>
        normalizeSearchValue(v).includes(query),
      ),
    );
  }, [nurseSearchQuery, sortedNurses]);

  const assignedNurseRecord =
    activeNurses.find((n) => n.userId === (careRequest?.assignedNurse ?? assignedNurseId)) ?? null;
  const selectedNurseRecord = activeNurses.find((n) => n.userId === assignedNurseId) ?? null;
  const assignedNurseLabel = assignedNurseRecord
    ? buildNurseLabel(assignedNurseRecord)
    : careRequest?.assignedNurse ?? "Sin asignar";
  const selectedNurseLabel = selectedNurseRecord ? buildNurseLabel(selectedNurseRecord) : assignedNurseLabel;

  const runAction = async (action: CareRequestTransitionAction) => {
    if (!id) return;
    setIsActing(true); setError(null); setSuccessMessage(null);
    try {
      const updated = await transitionCareRequest(id, action);
      setCareRequest(updated);
      const labels: Record<CareRequestTransitionAction, string> = {
        approve: "Solicitud aprobada exitosamente.",
        reject: "Solicitud rechazada.",
        complete: "Solicitud completada exitosamente.",
        cancel: "Solicitud cancelada.",
      };
      setSuccessMessage(labels[action]);
    } catch (nextError: any) {
      hapticFeedback.error();
      setError(nextError.message ?? "No fue posible actualizar la solicitud.");
    } finally {
      setIsActing(false);
    }
  };

  const runAssignment = async () => {
    if (!id || !assignedNurseId) return;
    setIsActing(true); setError(null); setSuccessMessage(null);
    try {
      const updated = await assignCareRequestNurse(id, { assignedNurse: assignedNurseId });
      setCareRequest(updated);
      setAssignedNurseId(updated.assignedNurse ?? assignedNurseId);
      setAssignmentSheetVisible(false);
      setSuccessMessage("Enfermera asignada correctamente.");
    } catch (nextError: any) {
      hapticFeedback.error();
      setError(nextError.message ?? "No fue posible asignar la enfermera.");
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading && !careRequest) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
      </View>
    );
  }

  if (!careRequest) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.errorText}>{error ?? "Solicitud no encontrada."}</Text>
      </View>
    );
  }

  const statusPalette = getStatusPalette(careRequest.status);
  const statusLabel = getStatusLabel(careRequest.status);
  const hasPricingData =
    careRequest.price != null ||
    careRequest.categoryFactorSnapshot != null ||
    careRequest.lineBeforeVolumeDiscount != null;

  const isAdmin = roles.includes("ADMIN");
  const canApproveOrReject = isAdmin && careRequest.status === "Pending";
  const canApprove = canApproveOrReject && Boolean(careRequest.assignedNurse);
  const canComplete =
    roles.includes("NURSE") && Boolean(userId) &&
    careRequest.status === "Approved" && careRequest.assignedNurse === userId;
  const canCancel =
    (roles.includes("CLIENT") || isAdmin) &&
    (careRequest.status === "Pending" || careRequest.status === "Approved");
  // Client reports a payment once the service is invoiced (ownership re-checked server-side).
  const canReportPayment = roles.includes("CLIENT") && careRequest.status === "Invoiced";

  // Build action set
  let primaryAction: FooterAction | null = null;
  if (canApprove) {
    primaryAction = {
      label: "Aprobar",
      onPress: () => void runAction("approve"),
      variant: "primary",
      disabled: isActing,
    };
  } else if (canComplete) {
    primaryAction = {
      label: "Completar",
      onPress: () => void runAction("complete"),
      variant: "primary",
      disabled: isActing,
    };
  } else if (canReportPayment) {
    primaryAction = {
      label: "Reportar pago",
      onPress: () => setPaymentSheetVisible(true),
      variant: "primary",
      disabled: isActing,
    };
  } else if (isAdmin && !careRequest.assignedNurse && careRequest.status === "Pending") {
    primaryAction = {
      label: "Asignar enfermera",
      onPress: () => setAssignmentSheetVisible(true),
      variant: "primary",
    };
  }

  let secondaryAction: FooterAction | null = null;
  if (isAdmin && careRequest.assignedNurse && (canApproveOrReject || careRequest.status === "Approved")) {
    secondaryAction = {
      label: "Cambiar enfermera",
      onPress: () => setAssignmentSheetVisible(true),
      // If there's no other primary action, this is the call-to-action — show blue.
      variant: primaryAction ? "secondary" : "primary",
    };
  }

  const overflowActions: FooterAction[] = [];
  if (canApproveOrReject) {
    overflowActions.push({
      label: "Rechazar solicitud",
      onPress: () => { setOverflowSheetVisible(false); void runAction("reject"); },
      variant: "danger",
      disabled: isActing,
      testID: careRequestTestIds.detail.overflowAction("reject"),
    });
  }
  if (canCancel) {
    overflowActions.push({
      label: "Cancelar solicitud",
      onPress: () => { setOverflowSheetVisible(false); void runAction("cancel"); },
      variant: "danger",
      disabled: isActing,
      testID: careRequestTestIds.detail.overflowAction("cancel"),
    });
  }

  const systemActions: FooterAction[] = [];
  if (primaryAction) systemActions.push(primaryAction);
  if (secondaryAction) systemActions.push(secondaryAction);
  const hasOverflow = overflowActions.length > 0;

  return (
    <>
      <MobileWorkspaceShell
        testID={careRequestTestIds.detail.screen}
        nativeID={careRequestTestIds.detail.screen}
        title="Solicitud"
        primaryReturnPlacement="header"
        onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.createCareRequest)}
        systemActions={systemActions.length > 0 ? systemActions : undefined}
        headerAccessory={
          hasOverflow ? (
            <Pressable
              testID={careRequestTestIds.detail.overflowTrigger}
              nativeID={careRequestTestIds.detail.overflowTrigger}
              onPress={() => {
                hapticFeedback.selection();
                setOverflowSheetVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Más acciones"
              style={({ pressed }) => [styles.overflowButton, pressed && styles.pressed]}
            >
              <Text style={styles.overflowGlyph}>⋯</Text>
            </Pressable>
          ) : undefined
        }
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {successMessage ? <Text style={styles.successBanner}>{successMessage}</Text> : null}
          {error ? (
            <Text
              style={styles.errorBanner}
              testID={careRequestTestIds.detail.errorBanner}
              nativeID={careRequestTestIds.detail.errorBanner}
            >
              {error}
            </Text>
          ) : null}

          {/* Estado */}
          <View
            style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusPalette.rail }]}
            testID={careRequestTestIds.detail.statusChip}
            nativeID={careRequestTestIds.detail.statusChip}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardEyebrow}>Estado</Text>
              <View style={[styles.countPill, { backgroundColor: statusPalette.bg }]}>
                <Text style={[styles.countPillText, { color: statusPalette.fg }]}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={3}>
              {careRequest.careRequestDescription}
            </Text>
            <Text style={styles.cardMeta}>Creada {formatDateTimeES(careRequest.createdAtUtc)}</Text>
          </View>

          {/* Servicio (combinado con precios) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardEyebrow}>Servicio</Text>
              <Pressable
                onPress={() => {
                  hapticFeedback.selection();
                  setPricingSheetVisible(true);
                }}
                disabled={!hasPricingData}
                testID={careRequestTestIds.detail.pricingBreakdownToggle}
                nativeID={careRequestTestIds.detail.pricingBreakdownToggle}
                style={({ pressed }) => [
                  styles.linkButton,
                  !hasPricingData && styles.disabled,
                  pressed && hasPricingData && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ver desglose de precios"
              >
                <Text style={styles.linkButtonText}>Ver desglose</Text>
              </Pressable>
            </View>
            <View style={styles.servicioGrid}>
              <View style={styles.servicioCol}>
                <Text style={styles.servicioLabel}>Tipo</Text>
                <Text style={styles.servicioValue} numberOfLines={1}>
                  {careRequest.careRequestType ?? "N/A"}
                </Text>
              </View>
              <View style={styles.servicioCol}>
                <Text style={styles.servicioLabel}>Fecha</Text>
                <Text style={styles.servicioValue} numberOfLines={1}>
                  {careRequest.careRequestDate ?? "Sin fecha"}
                </Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(careRequest.total)}</Text>
            </View>
          </View>

          {/* Asignación */}
          <View
            style={[
              styles.card,
              !careRequest.assignedNurse && {
                borderLeftWidth: 4,
                borderLeftColor: designTokens.color.status.warningText,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardEyebrow}>Asignación</Text>
              {isAdmin ? (
                <Pressable
                  onPress={() => {
                    hapticFeedback.selection();
                    setAssignmentSheetVisible(true);
                  }}
                  testID={careRequestTestIds.detail.assignmentSheetTrigger}
                  nativeID={careRequestTestIds.detail.assignmentSheetTrigger}
                  style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={careRequest.assignedNurse ? "Cambiar enfermera" : "Asignar enfermera"}
                >
                  <Text style={styles.linkButtonText}>
                    {careRequest.assignedNurse ? "Cambiar" : "Asignar"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{selectedNurseLabel}</Text>
            {careRequest.suggestedNurse ? (
              <Text style={styles.cardMeta}>Sugerida: {careRequest.suggestedNurse}</Text>
            ) : null}
            {canApproveOrReject && !canApprove ? (
              <Text style={styles.assignmentWarning}>Asigna una enfermera activa antes de aprobar.</Text>
            ) : null}
          </View>

          {/* Motivo de rechazo */}
          {careRequest.rejectionReason ? (
            <View
              style={[
                styles.card,
                {
                  borderLeftWidth: 4,
                  borderLeftColor: designTokens.color.status.dangerText,
                  backgroundColor: designTokens.color.surface.danger,
                },
              ]}
            >
              <Text style={[styles.cardEyebrow, { color: designTokens.color.status.dangerText }]}>Motivo de rechazo</Text>
              <Text style={styles.cardTitle}>{careRequest.rejectionReason}</Text>
            </View>
          ) : null}

          {/* Estado de pago — visible for statuses where billing information is relevant */}
          <PaymentStatusCard careRequest={careRequest} />
        </ScrollView>
      </MobileWorkspaceShell>

      <PricingSheet
        visible={pricingSheetVisible}
        careRequest={careRequest}
        onClose={() => {
          hapticFeedback.selection();
          setPricingSheetVisible(false);
        }}
      />

      <AssignmentSheet
        visible={assignmentSheetVisible}
        nurses={filteredNurses}
        selectedNurseId={assignedNurseId}
        searchQuery={nurseSearchQuery}
        isSubmitting={isActing}
        onSearchChange={setNurseSearchQuery}
        onSelect={(value) => {
          hapticFeedback.selection();
          setAssignedNurseId(value);
        }}
        onClose={() => {
          hapticFeedback.selection();
          setAssignmentSheetVisible(false);
        }}
        onConfirm={() => void runAssignment()}
      />

      <OverflowActionsSheet
        visible={overflowSheetVisible}
        actions={overflowActions}
        onClose={() => {
          hapticFeedback.selection();
          setOverflowSheetVisible(false);
        }}
      />

      <PaymentProofSheet
        visible={paymentSheetVisible}
        submitting={isActing}
        onClose={() => {
          hapticFeedback.selection();
          setPaymentSheetVisible(false);
        }}
        onSubmit={runReportPayment}
      />
    </>
  );
}

/**
 * Maps a paymentStatus string (from backend) to a StatusBadge tone.
 * - "Anulado"              → danger
 * - "Pagado"               → success
 * - "Facturado"            → info (warning tone used for "en proceso")
 * - "Pendiente de factura" → neutral
 */
function getPaymentStatusTone(paymentStatus: string | null | undefined): "neutral" | "warning" | "success" | "danger" | "info" {
  switch (paymentStatus) {
    case "Anulado": return "danger";
    case "Pagado": return "success";
    case "Facturado": return "info";
    default: return "neutral";
  }
}

/**
 * Renders an "Estado de pago" card for the client.
 * Only shown when the care request has reached Completed status or beyond
 * (i.e., billing information is relevant). Hidden for Pending/Approved/Rejected/Cancelled.
 */
function PaymentStatusCard({ careRequest }: { careRequest: CareRequestDto }) {
  const showBilling =
    careRequest.status === "Completed" ||
    careRequest.status === "Invoiced" ||
    careRequest.status === "PaymentReported" ||
    careRequest.status === "Paid" ||
    careRequest.status === "Voided";

  if (!showBilling) return null;

  const paymentStatus = careRequest.paymentStatus ?? "Pendiente de factura";
  const tone = getPaymentStatusTone(paymentStatus);

  return (
    <View
      style={styles.card}
      testID={careRequestTestIds.detail.paymentStatusCard}
      nativeID={careRequestTestIds.detail.paymentStatusCard}
    >
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardEyebrow}>Estado de pago</Text>
        <StatusBadge
          label={paymentStatus}
          tone={tone}
          testID={careRequestTestIds.detail.paymentStatusBadge}
        />
      </View>

      {/* Total charged to the client */}
      <View
        style={styles.totalRow}
        testID={careRequestTestIds.detail.paymentStatusTotal}
        nativeID={careRequestTestIds.detail.paymentStatusTotal}
      >
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatDOP(careRequest.total)}</Text>
      </View>

      {/* Invoice number */}
      {careRequest.invoiceNumber ? (
        <View
          style={styles.billingRow}
          testID={careRequestTestIds.detail.paymentStatusInvoiceNumber}
          nativeID={careRequestTestIds.detail.paymentStatusInvoiceNumber}
        >
          <Text style={styles.billingLabel}>N.o de factura</Text>
          <Text style={styles.billingValue}>{careRequest.invoiceNumber}</Text>
        </View>
      ) : null}

      {/* Invoice date */}
      {careRequest.invoicedAtUtc ? (
        <View
          style={styles.billingRow}
          testID={careRequestTestIds.detail.paymentStatusInvoicedAt}
          nativeID={careRequestTestIds.detail.paymentStatusInvoicedAt}
        >
          <Text style={styles.billingLabel}>Fecha de factura</Text>
          <Text style={styles.billingValue}>{formatDateTimeES(careRequest.invoicedAtUtc)}</Text>
        </View>
      ) : null}

      {/* Paid date */}
      {careRequest.paidAtUtc ? (
        <View
          style={styles.billingRow}
          testID={careRequestTestIds.detail.paymentStatusPaidAt}
          nativeID={careRequestTestIds.detail.paymentStatusPaidAt}
        >
          <Text style={styles.billingLabel}>Fecha de pago</Text>
          <Text style={styles.billingValue}>{formatDateTimeES(careRequest.paidAtUtc)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PaymentProofSheet({
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (imageUri: string, mimeType: string, note: string) => void;
}) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [note, setNote] = useState("");
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setImageUri(null);
      setMimeType("image/jpeg");
      setNote("");
      setPickError(null);
    }
  }, [visible]);

  const pickImage = async () => {
    hapticFeedback.selection();
    setPickError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickError("Necesitamos permiso para acceder a tus fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setMimeType(asset.mimeType ?? "image/jpeg");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Reportar pago</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>

          <Text style={styles.sheetHint}>
            Adjunta una foto de la factura o la captura de la transferencia. La administración
            verificará el pago en el banco antes de confirmarlo.
          </Text>

          <Pressable
            onPress={() => void pickImage()}
            style={styles.proofPickButton}
            accessibilityRole="button"
            accessibilityLabel="Elegir imagen del comprobante"
            testID="report-payment-pick-image"
          >
            <Text style={styles.proofPickButtonText}>
              {imageUri ? "Cambiar imagen" : "Elegir imagen del comprobante"}
            </Text>
          </Pressable>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.proofPreview} resizeMode="contain" />
          ) : null}

          {pickError ? <Text style={styles.errorBanner}>{pickError}</Text> : null}

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Nota (referencia bancaria, banco, etc.)"
            placeholderTextColor={designTokens.color.ink.muted}
            style={styles.proofNoteInput}
            multiline
            testID="report-payment-note"
          />

          <Pressable
            onPress={() => {
              hapticFeedback.light();
              if (imageUri) onSubmit(imageUri, mimeType, note);
            }}
            disabled={!imageUri || submitting}
            style={({ pressed }) => [
              styles.proofSubmitButton,
              (!imageUri || submitting) && styles.proofSubmitButtonDisabled,
              pressed && imageUri && !submitting && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enviar reporte de pago"
            testID="report-payment-submit"
          >
            <Text style={styles.proofSubmitButtonText}>
              {submitting ? "Enviando..." : "Enviar reporte de pago"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PricingSheet({
  visible,
  careRequest,
  onClose,
}: {
  visible: boolean;
  careRequest: CareRequestDto;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View
          style={styles.sheet}
          testID={careRequestTestIds.detail.pricingSheet}
          nativeID={careRequestTestIds.detail.pricingSheet}
        >
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Desglose de precios</Text>
              <Text style={styles.sheetSubtitle}>{formatCurrency(careRequest.total)}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
            <PriceRow label="Total" value={formatCurrency(careRequest.total)} emphasis testID="price-breakdown-total" />
            <PriceRow label="Precio base" value={formatCurrency(careRequest.price)} testID="price-breakdown-base-price" />
            {careRequest.categoryFactorSnapshot != null && careRequest.categoryFactorSnapshot !== 1 ? (
              <PriceRow label="Factor de categoría" value={formatFactor(careRequest.categoryFactorSnapshot)} testID="price-breakdown-category-factor" />
            ) : null}
            {careRequest.distanceFactorMultiplierSnapshot != null && careRequest.distanceFactorMultiplierSnapshot !== 1 ? (
              <PriceRow label="Factor de distancia" value={formatFactor(careRequest.distanceFactorMultiplierSnapshot)} testID="price-breakdown-distance-factor" />
            ) : null}
            {careRequest.complexityMultiplierSnapshot != null && careRequest.complexityMultiplierSnapshot !== 1 ? (
              <PriceRow label="Factor de complejidad" value={formatFactor(careRequest.complexityMultiplierSnapshot)} testID="price-breakdown-complexity-factor" />
            ) : null}
            {careRequest.volumeDiscountPercentSnapshot != null && careRequest.volumeDiscountPercentSnapshot > 0 ? (
              <PriceRow label="Descuento por volumen" value={formatPercent(careRequest.volumeDiscountPercentSnapshot)} testID="price-breakdown-volume-discount" />
            ) : null}
            {careRequest.medicalSuppliesCost != null && careRequest.medicalSuppliesCost > 0 ? (
              <PriceRow label="Insumos médicos" value={formatCurrency(careRequest.medicalSuppliesCost)} testID="price-breakdown-medical-supplies" />
            ) : null}
            <PriceRow label="Categoría" value={careRequest.pricingCategoryCode ?? careRequest.careRequestType ?? "N/A"} testID="price-breakdown-category" />
            <PriceRow label="Precio base del cliente" value={formatCurrency(careRequest.clientBasePrice)} testID="price-breakdown-client-base-price" />
            <PriceRow label="Línea antes de descuento" value={formatCurrency(careRequest.lineBeforeVolumeDiscount)} testID="price-breakdown-line-before-discount" />
            <PriceRow label="Precio unitario tras descuento" value={formatCurrency(careRequest.unitPriceAfterVolumeDiscount)} testID="price-breakdown-unit-price-after-discount" />
            <PriceRow label="Subtotal antes de insumos" value={formatCurrency(careRequest.subtotalBeforeSupplies)} testID="price-breakdown-subtotal-before-supplies" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PriceRow({ label, value, emphasis = false, testID }: { label: string; value: string; emphasis?: boolean; testID: string }) {
  return (
    <View testID={testID} nativeID={testID} style={[styles.priceRow, emphasis && styles.priceRowEmphasis]}>
      <Text style={[styles.priceLabel, emphasis && styles.priceTextEmphasis]}>{label}</Text>
      <Text style={[styles.priceValue, emphasis && styles.priceTextEmphasis]}>{value}</Text>
    </View>
  );
}

function AssignmentSheet({
  visible, nurses, selectedNurseId, searchQuery, isSubmitting,
  onSearchChange, onSelect, onClose, onConfirm,
}: {
  visible: boolean;
  nurses: ActiveNurseProfileSummary[];
  selectedNurseId: string;
  searchQuery: string;
  isSubmitting: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View
          style={styles.sheet}
          testID={careRequestTestIds.detail.assignmentSheet}
          nativeID={careRequestTestIds.detail.assignmentSheet}
        >
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Seleccionar enfermera</Text>
              <Text style={styles.sheetSubtitle}>{nurses.length} resultado{nurses.length === 1 ? "" : "s"}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>
          <TextInput
            testID={careRequestTestIds.detail.assignmentSearchInput}
            nativeID={careRequestTestIds.detail.assignmentSearchInput}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Buscar por nombre, correo o especialidad"
            placeholderTextColor={designTokens.color.ink.muted}
            style={styles.searchInput}
            accessibilityLabel="Buscar enfermera"
            autoCapitalize="none"
          />
          <ScrollView style={styles.nurseList} contentContainerStyle={styles.nurseListContent}>
            {nurses.length === 0 ? <Text style={styles.emptyText}>No se encontraron enfermeras.</Text> : null}
            {nurses.map((item) => {
              const selected = selectedNurseId === item.userId;
              const meta = [item.specialty, item.category, item.email].filter(Boolean).join(" · ");
              return (
                <Pressable
                  key={item.userId}
                  testID={careRequestTestIds.detail.assignmentNurseOption(item.userId)}
                  nativeID={careRequestTestIds.detail.assignmentNurseOption(item.userId)}
                  onPress={() => onSelect(item.userId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar enfermera ${buildNurseLabel(item)}`}
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.nurseRow,
                    selected && styles.nurseRowSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.nurseRowText}>
                    <Text style={styles.nurseName}>{buildNurseLabel(item)}</Text>
                    <Text style={styles.nurseMeta} numberOfLines={1}>
                      {meta || "Sin datos adicionales"}
                    </Text>
                  </View>
                  <Text style={[styles.nurseCheck, selected && styles.nurseCheckSelected]}>
                    {selected ? "Seleccionada" : "Elegir"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            testID={careRequestTestIds.detail.assignmentConfirmButton}
            nativeID={careRequestTestIds.detail.assignmentConfirmButton}
            onPress={() => {
              hapticFeedback.light();
              onConfirm();
            }}
            disabled={isSubmitting || !selectedNurseId}
            style={({ pressed }) => [
              styles.sheetPrimaryButton,
              (isSubmitting || !selectedNurseId) && styles.disabled,
              pressed && !isSubmitting && selectedNurseId ? styles.pressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Confirmar enfermera asignada"
          >
            <Text style={styles.sheetPrimaryButtonText}>
              {isSubmitting ? "Guardando..." : "Confirmar asignación"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function OverflowActionsSheet({
  visible,
  actions,
  onClose,
}: {
  visible: boolean;
  actions: FooterAction[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View
          style={[styles.sheet, { minHeight: undefined, maxHeight: "60%" }]}
          testID={careRequestTestIds.detail.overflowSheet}
          nativeID={careRequestTestIds.detail.overflowSheet}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Más acciones</Text>
            <Pressable onPress={onClose} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>
          <View style={styles.overflowList}>
            {actions.map((action, idx) => {
              const isDanger = action.variant === "danger";
              return (
                <Pressable
                  key={action.testID ?? idx}
                  testID={action.testID}
                  nativeID={action.testID}
                  onPress={() => {
                    hapticFeedback.light();
                    action.onPress();
                  }}
                  disabled={action.disabled}
                  style={({ pressed }) => [
                    styles.overflowAction,
                    isDanger && {
                      borderColor: designTokens.color.border.danger,
                      backgroundColor: designTokens.color.surface.danger,
                    },
                    action.disabled && styles.disabled,
                    pressed && !action.disabled && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Text
                    style={[
                      styles.overflowActionText,
                      isDanger && { color: designTokens.color.status.dangerText },
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: designTokens.color.surface.canvas, padding: 24,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16, gap: 10 },
  successBanner: {
    color: designTokens.color.status.successText,
    backgroundColor: designTokens.color.surface.success,
    fontSize: 13, fontWeight: "800",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  errorBanner: {
    color: designTokens.color.status.dangerText,
    backgroundColor: designTokens.color.surface.danger,
    fontSize: 13, fontWeight: "700",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: {
    color: designTokens.color.ink.danger, lineHeight: 21, textAlign: "center",
  },
  sheetHint: {
    color: designTokens.color.ink.secondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  proofPickButton: {
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  proofPickButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontWeight: "700",
    fontSize: 15,
  },
  proofPreview: {
    width: "100%",
    height: 220,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.color.surface.secondary,
    marginBottom: 12,
  },
  proofNoteInput: {
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    padding: 12,
    minHeight: 64,
    color: designTokens.color.ink.primary,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  proofSubmitButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    borderRadius: designTokens.radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  proofSubmitButtonDisabled: {
    backgroundColor: designTokens.color.border.strong,
  },
  proofSubmitButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "700",
    fontSize: 16,
  },
  card: {
    backgroundColor: mobileTheme.colors.surface.primary,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
    elevation: 1,
    padding: 14, gap: 6,
  },
  cardHeaderRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
  },
  cardEyebrow: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6,
  },
  cardTitle: {
    color: mobileTheme.colors.ink.primary, fontSize: 17, lineHeight: 22, fontWeight: "900",
  },
  cardMeta: {
    color: mobileTheme.colors.ink.secondary, fontSize: 12, fontWeight: "600",
  },
  countPill: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  countPillText: {
    fontSize: 12, fontWeight: "800",
  },
  servicioGrid: {
    flexDirection: "row", gap: 14, marginTop: 4,
  },
  servicioCol: { flex: 1, minWidth: 0 },
  servicioLabel: {
    color: mobileTheme.colors.ink.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase",
  },
  servicioValue: {
    color: mobileTheme.colors.ink.primary, fontSize: 14, fontWeight: "800", marginTop: 2,
  },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 8, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: mobileTheme.colors.border.subtle,
  },
  totalLabel: {
    color: mobileTheme.colors.ink.secondary, fontSize: 13, fontWeight: "800",
  },
  totalValue: {
    color: mobileTheme.colors.ink.accent, fontSize: 22, fontWeight: "900",
  },
  billingRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 8, gap: 12,
  },
  billingLabel: {
    color: mobileTheme.colors.ink.muted, fontSize: 13, fontWeight: "700", flex: 1,
  },
  billingValue: {
    color: mobileTheme.colors.ink.primary, fontSize: 13, fontWeight: "800", textAlign: "right", flex: 1,
  },
  linkButton: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: mobileTheme.colors.surface.secondary,
  },
  linkButtonText: {
    color: mobileTheme.colors.ink.accent, fontSize: 13, fontWeight: "900",
  },
  assignmentWarning: {
    color: designTokens.color.status.warningText, fontSize: 12, fontWeight: "700", marginTop: 4,
  },
  overflowButton: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: mobileTheme.colors.surface.secondary,
  },
  overflowGlyph: {
    fontSize: 22, fontWeight: "900", color: mobileTheme.colors.ink.primary, lineHeight: 22,
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },

  // Sheet styles (shared)
  sheetBackdrop: {
    flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)",
  },
  sheet: {
    maxHeight: "86%", minHeight: "58%",
    backgroundColor: designTokens.color.surface.primary,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, gap: 12,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  sheetTitle: {
    color: designTokens.color.ink.primary, fontSize: 20, fontWeight: "900",
  },
  sheetSubtitle: {
    color: designTokens.color.ink.secondary, fontSize: 13, fontWeight: "700", marginTop: 2,
  },
  sheetClose: {
    minHeight: 38, borderRadius: 12, paddingHorizontal: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: designTokens.color.surface.secondary,
  },
  sheetCloseText: { color: designTokens.color.ink.primary, fontWeight: "800" },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingBottom: 8 },
  priceRow: {
    flexDirection: "row", justifyContent: "space-between", gap: 16,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: designTokens.color.border.subtle,
  },
  priceRowEmphasis: {
    borderTopWidth: 2, borderTopColor: designTokens.color.ink.accent, marginTop: 2,
  },
  priceLabel: { color: designTokens.color.ink.secondary, fontSize: 14, flex: 1 },
  priceValue: { color: designTokens.color.ink.primary, fontSize: 14, fontWeight: "800", textAlign: "right", flex: 1 },
  priceTextEmphasis: { color: designTokens.color.ink.accent, fontSize: 16, fontWeight: "900" },
  searchInput: {
    minHeight: 48, borderRadius: 14, borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    backgroundColor: designTokens.color.surface.primary,
    color: designTokens.color.ink.primary, paddingHorizontal: 14, fontSize: 15,
  },
  nurseList: { flex: 1 },
  nurseListContent: { paddingBottom: 8, gap: 8 },
  nurseRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
    borderRadius: 14, borderWidth: 1, borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  nurseRowSelected: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.surface.accent,
  },
  nurseRowText: { flex: 1, minWidth: 0 },
  nurseName: { color: designTokens.color.ink.primary, fontSize: 15, fontWeight: "900" },
  nurseMeta: { color: designTokens.color.ink.secondary, fontSize: 12, fontWeight: "600", marginTop: 3 },
  nurseCheck: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "900" },
  nurseCheckSelected: { color: designTokens.color.ink.accent },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14, textAlign: "center", paddingVertical: 24 },
  sheetPrimaryButton: {
    minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: designTokens.color.ink.accent,
  },
  sheetPrimaryButtonText: { color: designTokens.color.ink.inverse, fontSize: 15, fontWeight: "900" },

  // Overflow sheet
  overflowList: { gap: 10, paddingTop: 4 },
  overflowAction: {
    minHeight: 52, borderRadius: 14, borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 16,
  },
  overflowActionText: {
    fontSize: 15, fontWeight: "900", color: designTokens.color.ink.primary,
  },
});
