import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CollapsibleSection } from "@/src/components/shared/CollapsibleSection";
import { designTokens } from "@/src/design-system/tokens";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import {
  assignCareRequestNurse,
  getActiveNurseProfiles,
  getCareRequestById,
  transitionCareRequest,
  verifyCareRequestPricing,
  type ActiveNurseProfileSummary,
  type PricingVerificationResult,
} from "@/src/services/careRequestService";
import { CareRequestDto, CareRequestTransitionAction } from "@/src/types/careRequest";
import { careRequestTestIds } from "@/src/testing/testIds";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";

function getStatusColors(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved":
      return { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText };
    case "Rejected":
      return { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText };
    case "Completed":
      return { bg: designTokens.color.status.infoBg, fg: designTokens.color.ink.accentStrong };
    case "Cancelled":
      return { bg: designTokens.color.surface.secondary, fg: designTokens.color.ink.secondary };
    default:
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
  }
}

function getStatusLabel(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved":
      return "Aprobada";
    case "Rejected":
      return "Rechazada";
    case "Completed":
      return "Completada";
    case "Cancelled":
      return "Cancelada";
    default:
      return "Pendiente";
  }
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
  const [showPricingReview, setShowPricingReview] = useState(false);
  const [showPricingBreakdown, setShowPricingBreakdown] = useState(false);
  const [pricingResult, setPricingResult] = useState<PricingVerificationResult | null>(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const loadCareRequest = async () => {
    if (!id) {
      return;
    }

    setError(null);

    try {
      const response = await getCareRequestById(id);
      setCareRequest(response);
      setAssignedNurseId(response.assignedNurse ?? "");
      logClientEvent("mobile.ui", "Care request detail loaded", { id });
    } catch (nextError: any) {
      setError(nextError.message ?? "No fue posible cargar la solicitud.");
      logClientEvent(
        "mobile.ui",
        "Care request detail failed",
        { id, message: nextError.message ?? "Unknown error" },
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCareRequest();
  }, [id]);

  useEffect(() => {
    if (!roles.includes("ADMIN")) {
      setActiveNurses([]);
      return;
    }

    void getActiveNurseProfiles()
      .then((response) => setActiveNurses(response))
      .catch(() => setActiveNurses([]));
  }, [roles]);

  const runAction = async (action: CareRequestTransitionAction) => {
    if (!id) {
      return;
    }

    setIsActing(true);
    setError(null);
    setSuccessMessage(null);

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
      setError(nextError.message ?? "No fue posible actualizar la solicitud.");
    } finally {
      setIsActing(false);
    }
  };

  const runAssignment = async () => {
    if (!id || !assignedNurseId) {
      return;
    }

    setIsActing(true);
    setError(null);

    try {
      const updated = await assignCareRequestNurse(id, { assignedNurse: assignedNurseId });
      setCareRequest(updated);
      setAssignedNurseId(updated.assignedNurse ?? assignedNurseId);
    } catch (nextError: any) {
      setError(nextError.message ?? "No fue posible asignar la enfermera.");
    } finally {
      setIsActing(false);
    }
  };

  const assignedNurseRecord =
    activeNurses.find((nurse) => nurse.userId === (careRequest?.assignedNurse ?? assignedNurseId)) ?? null;
  const assignedNurseLabel = assignedNurseRecord
    ? [assignedNurseRecord.name, assignedNurseRecord.lastName].filter(Boolean).join(" ") || assignedNurseRecord.email
    : careRequest?.assignedNurse ?? "Sin asignar";
  const runPricingVerification = async () => {
    if (!id) return;
    setIsPricingLoading(true);
    setPricingError(null);
    setPricingResult(null);
    try {
      const result = await verifyCareRequestPricing(id);
      setPricingResult(result);
    } catch (nextError: any) {
      setPricingError(nextError.message ?? "No fue posible verificar los precios.");
    } finally {
      setIsPricingLoading(false);
    }
  };

  const openPricingReview = () => {
    setShowPricingReview(true);
    setShowPricingBreakdown(true);
    setPricingError(null);
    setPricingResult(null);
  };

  const closePricingReview = () => {
    setShowPricingReview(false);
  };

  const canManageAssignment = roles.includes("ADMIN");
  const canApproveOrReject =
    roles.includes("ADMIN") && careRequest?.status === "Pending";
  const canApprove = canApproveOrReject && Boolean(careRequest?.assignedNurse ?? assignedNurseId);
  const canComplete =
    roles.includes("NURSE") &&
    Boolean(userId) &&
    careRequest?.status === "Approved" &&
    careRequest.assignedNurse === userId;
  const canCancel =
    (roles.includes("CLIENT") || roles.includes("ADMIN")) &&
    (careRequest?.status === "Pending" || careRequest?.status === "Approved");

  if (isLoading && !careRequest) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator
          color={designTokens.color.ink.accentStrong}
          accessibilityLabel="Cargando..."
        />
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

  const colors = getStatusColors(careRequest.status);
  const statusLabel = getStatusLabel(careRequest.status);

  const formatCurrency = (value: number | null | undefined) =>
    value != null ? `RD$ ${value.toLocaleString("es-DO", { minimumFractionDigits: 2 })}` : "N/A";
  const formatFactor = (value: number | null | undefined) =>
    value != null ? value.toFixed(4) : "N/A";
  const formatPercent = (value: number | null | undefined) =>
    value != null ? `${value}%` : "N/A";

  const hasPricingData =
    careRequest.price != null ||
    careRequest.categoryFactorSnapshot != null ||
    careRequest.lineBeforeVolumeDiscount != null;
  const primaryActionLabel = roles.includes("ADMIN")
    ? "Preparar verificación de precios"
    : "Consultar desglose tarifario";

  return (
    <>
    <MobileWorkspaceShell
      testID={careRequestTestIds.detail.screen}
      nativeID={careRequestTestIds.detail.screen}
      eyebrow="Detalle de solicitud"
      title="Detalle de Solicitud"
      description="Informacion completa de la solicitud de servicio."
      primaryReturnLabel="Volver a solicitudes"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.createCareRequest)}
    >
      <View style={styles.card} testID={careRequestTestIds.detail.screen} nativeID={careRequestTestIds.detail.screen}>
        <Text style={styles.eyebrow}>Detalle de solicitud</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{careRequest.careRequestDescription}</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: colors.bg }]}
            testID={careRequestTestIds.detail.statusChip}
            nativeID={careRequestTestIds.detail.statusChip}
          >
            <Text style={[styles.statusText, { color: colors.fg }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionEyebrow}>Historia operativa</Text>
          <Text style={styles.summaryTitle}>Estado y próximo paso visibles antes del detalle técnico</Text>
          <Text style={styles.summaryCopy}>
            Revisa el estado actual, confirma la enfermera asignada y abre la verificación de precios solo cuando necesites comparar el cálculo guardado con el actual.
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>Estado actual</Text>
              <Text style={styles.summaryValue}>{statusLabel}</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>Fecha del servicio</Text>
              <Text style={styles.summaryValue}>{careRequest.careRequestDate ?? "Sin fecha"}</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>Enfermera asignada</Text>
              <Text style={styles.summaryValue}>{assignedNurseLabel}</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>Total estimado</Text>
              <Text style={styles.summaryValue}>{formatCurrency(careRequest.total)}</Text>
            </View>
          </View>
        </View>

        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
        {error ? (
          <Text
            style={styles.errorBanner}
            testID={careRequestTestIds.detail.errorBanner}
            nativeID={careRequestTestIds.detail.errorBanner}
          >
            {error}
          </Text>
        ) : null}

        <View style={styles.actionRail}>
          {hasPricingData ? (
            <Pressable
              onPress={showPricingReview ? closePricingReview : openPricingReview}
              testID={careRequestTestIds.detail.pricingBreakdownToggle}
              nativeID={careRequestTestIds.detail.pricingBreakdownToggle}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.pricingButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={showPricingReview ? "Cerrar revisión de precios" : primaryActionLabel}
            >
              <Text style={styles.pricingButtonText}>
                {showPricingReview ? "Cerrar revisión de precios" : primaryActionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {showPricingReview ? (
          <View
            style={styles.reviewCard}
            testID={careRequestTestIds.detail.pricingReviewPanel}
            nativeID={careRequestTestIds.detail.pricingReviewPanel}
          >
            <Text style={styles.sectionEyebrow}>Revisión guiada</Text>
            <Text style={styles.reviewTitle}>Confirma el cálculo antes de comparar valores</Text>
            <Text style={styles.reviewCopy}>
              Esta revisión mantiene el contexto operativo visible y evita abrir una ventana separada. Ejecuta la validación solo cuando estés listo para contrastar el cálculo guardado con el actual.
            </Text>
            <View style={styles.reviewChecklist}>
              <Text style={styles.reviewChecklistItem}>• El estado actual permanece visible durante la revisión.</Text>
              <Text style={styles.reviewChecklistItem}>• Las acciones sensibles siguen debajo del resumen principal.</Text>
              <Text style={styles.reviewChecklistItem}>• El desglose profundo permanece dentro de este mismo recorrido.</Text>
            </View>
            <View style={styles.reviewActions}>
              <Pressable
                onPress={() => setShowPricingBreakdown((current) => !current)}
                testID={careRequestTestIds.detail.pricingBreakdownToggle}
                nativeID={careRequestTestIds.detail.pricingBreakdownToggle}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.reviewSecondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={showPricingBreakdown ? "Ocultar desglose de precios" : "Mostrar desglose de precios"}
              >
                <Text style={styles.reviewSecondaryButtonText}>
                  {showPricingBreakdown ? "Ocultar desglose" : "Mostrar desglose"}
                </Text>
              </Pressable>
              {roles.includes("ADMIN") ? (
                <Pressable
                  onPress={runPricingVerification}
                  disabled={isPricingLoading}
                  testID={careRequestTestIds.detail.pricingReviewConfirmButton}
                  nativeID={careRequestTestIds.detail.pricingReviewConfirmButton}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isPricingLoading && styles.disabledButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Ejecutar verificación de precios"
                >
                  <Text style={styles.primaryButtonText}>
                    {isPricingLoading ? "Verificando..." : "Ejecutar verificación"}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {isPricingLoading ? (
              <View style={styles.pricingLoadingRow}>
                <ActivityIndicator
                  color={designTokens.color.ink.accentStrong}
                  accessibilityLabel="Cargando..."
                />
                <Text style={styles.pricingLoadingText}>Verificando precios...</Text>
              </View>
            ) : null}

            {pricingError ? <Text style={styles.pricingErrorText}>{pricingError}</Text> : null}

            {pricingResult && pricingResult.matches ? (
              <View style={styles.pricingSuccessCard} testID="price-verification-success" nativeID="price-verification-success">
                <Text style={styles.pricingSuccessText}>Todos los valores coinciden</Text>
                {pricingResult.limitationNotes.length > 0 ? (
                  <View style={styles.pricingNotesList} testID="price-verification-limitation" nativeID="price-verification-limitation">
                    {pricingResult.limitationNotes.map((note, i) => (
                      <Text key={i} style={styles.pricingNoteItem}>{note}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {pricingResult && !pricingResult.matches ? (
              <View style={styles.pricingDiscrepancyCard} testID="price-verification-discrepancies" nativeID="price-verification-discrepancies">
                <Text style={styles.pricingDiscrepancyTitle}>Discrepancias encontradas</Text>
                <View style={styles.pricingTableHeader}>
                  <Text style={[styles.pricingTableCell, styles.pricingTableHeaderText]}>Campo</Text>
                  <Text style={[styles.pricingTableCell, styles.pricingTableHeaderText]}>Guardado</Text>
                  <Text style={[styles.pricingTableCell, styles.pricingTableHeaderText]}>Actual</Text>
                </View>
                {pricingResult.discrepancies.map((d, i) => (
                  <View key={i} style={styles.pricingTableRow}>
                    <Text style={styles.pricingTableCell}>{d.fieldName}</Text>
                    <Text style={styles.pricingTableCell}>{d.storedValue}</Text>
                    <Text style={styles.pricingTableCell}>{d.currentValue}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.metaGroup} testID="care-detail-info-section" nativeID="care-detail-info-section">
          <Text style={styles.metaText}>
            Enfermera asignada: {assignedNurseLabel}
          </Text>
          <Text style={styles.metaText}>
            Enfermera sugerida: {careRequest.suggestedNurse ?? "Sin sugerencia"}
          </Text>
          <Text style={styles.metaText}>
            Fecha del servicio: {careRequest.careRequestDate ?? "Sin fecha"}
          </Text>
          <Text style={styles.metaText}>
            Creada: {formatDateTimeES(careRequest.createdAtUtc)}
          </Text>
          <Text style={styles.metaText}>
            Actualizada: {formatDateTimeES(careRequest.updatedAtUtc)}
          </Text>
          {careRequest.approvedAtUtc && (
            <Text style={styles.metaText}>
              Aprobada: {formatDateTimeES(careRequest.approvedAtUtc)}
            </Text>
          )}
          {careRequest.rejectedAtUtc && (
            <Text style={styles.metaText}>
              Rechazada: {formatDateTimeES(careRequest.rejectedAtUtc)}
            </Text>
          )}
          {careRequest.rejectionReason && (
            <Text style={styles.metaText}>
              Razon de rechazo: {careRequest.rejectionReason}
            </Text>
          )}
          {careRequest.completedAtUtc && (
            <Text style={styles.metaText}>
              Completada: {formatDateTimeES(careRequest.completedAtUtc)}
            </Text>
          )}
          {careRequest.cancelledAtUtc && (
            <Text style={styles.metaText}>
              Cancelada: {formatDateTimeES(careRequest.cancelledAtUtc)}
            </Text>
          )}
        </View>

        {hasPricingData && showPricingBreakdown ? (
          <View style={styles.pricingBreakdown} testID="care-detail-pricing-breakdown" nativeID="care-detail-pricing-breakdown">
            <Text style={styles.sectionEyebrow}>Desglose de precios</Text>

            {/* Always visible: Total */}
            <View testID="price-breakdown-total" nativeID="price-breakdown-total" style={[styles.pricingRow, styles.pricingTotalRow]}>
              <Text style={[styles.pricingLabel, styles.pricingTotalLabel]}>Total</Text>
              <Text style={[styles.pricingValue, styles.pricingTotalValue]}>{formatCurrency(careRequest.total)}</Text>
            </View>

            {/* Always visible: Precio base */}
            <View testID="price-breakdown-base-price" nativeID="price-breakdown-base-price" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Precio base</Text>
              <Text style={styles.pricingValue}>{formatCurrency(careRequest.price)}</Text>
            </View>

            {/* Conditional: factor de categoria (show if != 1) */}
            {careRequest.categoryFactorSnapshot != null && careRequest.categoryFactorSnapshot !== 1 && (
              <View testID="price-breakdown-category-factor" nativeID="price-breakdown-category-factor" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Factor de categoria</Text>
                <Text style={styles.pricingValue}>{formatFactor(careRequest.categoryFactorSnapshot)}</Text>
              </View>
            )}

            {/* Conditional: factor de distancia (show if != 1) */}
            {careRequest.distanceFactorMultiplierSnapshot != null && careRequest.distanceFactorMultiplierSnapshot !== 1 && (
              <View testID="price-breakdown-distance-factor" nativeID="price-breakdown-distance-factor" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Factor de distancia</Text>
                <Text style={styles.pricingValue}>{formatFactor(careRequest.distanceFactorMultiplierSnapshot)}</Text>
              </View>
            )}

            {/* Conditional: factor de complejidad (show if != 1) */}
            {careRequest.complexityMultiplierSnapshot != null && careRequest.complexityMultiplierSnapshot !== 1 && (
              <View testID="price-breakdown-complexity-factor" nativeID="price-breakdown-complexity-factor" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Factor de complejidad</Text>
                <Text style={styles.pricingValue}>{formatFactor(careRequest.complexityMultiplierSnapshot)}</Text>
              </View>
            )}

            {/* Conditional: descuento por volumen (show if > 0) */}
            {careRequest.volumeDiscountPercentSnapshot != null && careRequest.volumeDiscountPercentSnapshot > 0 && (
              <View testID="price-breakdown-volume-discount" nativeID="price-breakdown-volume-discount" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Descuento por volumen</Text>
                <Text style={styles.pricingValue}>{formatPercent(careRequest.volumeDiscountPercentSnapshot)}</Text>
              </View>
            )}

            {/* Conditional: insumos medicos (show if > 0) */}
            {careRequest.medicalSuppliesCost != null && careRequest.medicalSuppliesCost > 0 && (
              <View testID="price-breakdown-medical-supplies" nativeID="price-breakdown-medical-supplies" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Insumos medicos</Text>
                <Text style={styles.pricingValue}>{formatCurrency(careRequest.medicalSuppliesCost)}</Text>
              </View>
            )}

            {/* Collapsed section: detailed breakdown */}
            <CollapsibleSection title="Ver desglose completo">
              <View testID="price-breakdown-category" nativeID="price-breakdown-category" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Categoria</Text>
                <Text style={styles.pricingValue}>{careRequest.pricingCategoryCode ?? careRequest.careRequestType ?? "N/A"}</Text>
              </View>
              <View testID="price-breakdown-client-base-price" nativeID="price-breakdown-client-base-price" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Precio base del cliente</Text>
                <Text style={styles.pricingValue}>{formatCurrency(careRequest.clientBasePrice)}</Text>
              </View>
              <View testID="price-breakdown-line-before-discount" nativeID="price-breakdown-line-before-discount" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Linea antes de descuento</Text>
                <Text style={styles.pricingValue}>{formatCurrency(careRequest.lineBeforeVolumeDiscount)}</Text>
              </View>
              <View testID="price-breakdown-unit-price-after-discount" nativeID="price-breakdown-unit-price-after-discount" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Precio unitario tras descuento</Text>
                <Text style={styles.pricingValue}>{formatCurrency(careRequest.unitPriceAfterVolumeDiscount)}</Text>
              </View>
              <View testID="price-breakdown-subtotal-before-supplies" nativeID="price-breakdown-subtotal-before-supplies" style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Subtotal antes de insumos</Text>
                <Text style={styles.pricingValue}>{formatCurrency(careRequest.subtotalBeforeSupplies)}</Text>
              </View>
            </CollapsibleSection>
          </View>
        ) : null}

        {canManageAssignment && (
          <View style={styles.assignmentCard}>
            <Text style={styles.sectionEyebrow}>Asignacion de enfermeria</Text>
            <Text style={styles.assignmentCopy}>
              Solo administracion puede asignar o reasignar la solicitud antes de aprobarla.
            </Text>

            {activeNurses.length === 0 ? (
              <Text style={styles.assignmentEmpty}>No hay enfermeras activas disponibles.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.nurseList}
              >
                {activeNurses.map((nurse) => {
                  const label =
                    [nurse.name, nurse.lastName].filter(Boolean).join(" ") || nurse.email;
                  const selected = assignedNurseId === nurse.userId;

                  return (
                    <Pressable
                      key={nurse.userId}
                      onPress={() => setAssignedNurseId(nurse.userId)}
                      style={({ pressed }) => [
                        styles.nurseChip,
                        selected && styles.nurseChipSelected,
                        pressed && styles.buttonPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Seleccionar enfermera ${label}`}
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.nurseChipText, selected && styles.nurseChipTextSelected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Pressable
              onPress={runAssignment}
              disabled={isActing || !assignedNurseId}
              style={({ pressed }) => [
                styles.primaryButton,
                (!assignedNurseId || isActing) && styles.disabledButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={careRequest.assignedNurse ? "Reasignar enfermera" : "Asignar enfermera"}
            >
              <Text style={styles.primaryButtonText}>
                {careRequest.assignedNurse ? "Reasignar enfermera" : "Asignar enfermera"}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.actionRow}>
          {canApproveOrReject && (
            <>
              <Pressable
                onPress={() => runAction("approve")}
                disabled={isActing || !canApprove}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.successButton,
                  (!canApprove || isActing) && styles.disabledButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Aprobar solicitud"
              >
                <Text style={styles.primaryButtonText}>Aprobar</Text>
              </Pressable>
              <Pressable
                onPress={() => runAction("reject")}
                disabled={isActing}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.rejectButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Rechazar solicitud"
              >
                <Text style={styles.secondaryButtonText}>Rechazar</Text>
              </Pressable>
            </>
          )}

          {canApproveOrReject && !canApprove && (
            <Text style={styles.assignmentWarning}>
              Debes asignar una enfermera activa antes de aprobar la solicitud.
            </Text>
          )}

          {canComplete && (
            <Pressable
              onPress={() => runAction("complete")}
              disabled={isActing}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Completar solicitud"
            >
              <Text style={styles.primaryButtonText}>Completar</Text>
            </Pressable>
          )}

          {canCancel && (
            <Pressable
              onPress={() => runAction("cancel")}
              disabled={isActing}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.cancelButton,
                isActing && styles.disabledButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancelar solicitud"
            >
              <Text style={styles.cancelButtonText}>Cancelar solicitud</Text>
            </Pressable>
          )}
        </View>
      </View>
    </MobileWorkspaceShell>
    </>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: designTokens.color.surface.accent,
    padding: 24,
  },
  backActionButton: {
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backActionButtonText: {
    color: designTokens.color.surface.canvas,
    fontWeight: "700",
  },
  card: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  eyebrow: {
    color: designTokens.color.ink.accent,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    fontSize: 12,
    marginBottom: 10,
  },
  headerRow: {
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    backgroundColor: designTokens.color.surface.accent,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    gap: 14,
    marginBottom: 18,
  },
  summaryTitle: {
    color: designTokens.color.ink.primary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },
  summaryCopy: {
    color: designTokens.color.ink.secondary,
    lineHeight: 21,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryMetric: {
    backgroundColor: designTokens.color.ink.inverse,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  summaryLabel: {
    color: designTokens.color.ink.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  summaryValue: {
    color: designTokens.color.ink.primary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  title: {
    color: designTokens.color.ink.primary,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metaGroup: {
    gap: 10,
  },
  actionRail: {
    gap: 12,
    marginBottom: 18,
  },
  reviewCard: {
    backgroundColor: designTokens.color.surface.warning,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: designTokens.color.status.warningText,
    gap: 14,
    marginBottom: 18,
  },
  reviewTitle: {
    color: designTokens.color.ink.primary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },
  reviewCopy: {
    color: designTokens.color.status.dangerText,
    lineHeight: 21,
  },
  reviewChecklist: {
    gap: 8,
  },
  reviewChecklistItem: {
    color: designTokens.color.status.dangerText,
    lineHeight: 21,
  },
  reviewActions: {
    gap: 12,
  },
  reviewSecondaryButton: {
    borderColor: designTokens.color.status.warningText,
    backgroundColor: designTokens.color.surface.warning,
  },
  reviewSecondaryButtonText: {
    color: designTokens.color.status.dangerText,
    fontWeight: "800",
    fontSize: 16,
  },
  assignmentCard: {
    marginTop: 24,
    gap: 12,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
  },
  sectionEyebrow: {
    color: designTokens.color.ink.accent,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: 12,
  },
  assignmentCopy: {
    color: designTokens.color.ink.secondary,
    lineHeight: 21,
  },
  assignmentEmpty: {
    color: designTokens.color.status.dangerText,
    lineHeight: 21,
  },
  nurseList: {
    gap: 10,
    paddingRight: 8,
  },
  nurseChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    backgroundColor: designTokens.color.surface.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nurseChipSelected: {
    backgroundColor: designTokens.color.ink.accent,
    borderColor: designTokens.color.ink.accent,
  },
  nurseChipText: {
    color: designTokens.color.ink.primary,
    fontWeight: "700",
  },
  nurseChipTextSelected: {
    color: designTokens.color.ink.inverse,
  },
  metaText: {
    color: designTokens.color.ink.secondary,
    lineHeight: 21,
  },
  assignmentWarning: {
    color: designTokens.color.status.warningText,
    lineHeight: 21,
  },
  actionRow: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: designTokens.color.ink.accent,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  successButton: {
    backgroundColor: designTokens.color.status.successText,
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.danger,
  },
  rejectButton: {
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.danger,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: designTokens.color.ink.danger,
    fontWeight: "800",
    fontSize: 16,
  },
  successText: {
    color: designTokens.color.status.successText,
    marginBottom: 16,
    lineHeight: 21,
    fontWeight: "700",
    backgroundColor: designTokens.color.surface.success,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: designTokens.color.ink.danger,
    lineHeight: 21,
    textAlign: "center",
  },
  errorBanner: {
    color: designTokens.color.ink.danger,
    marginBottom: 16,
    lineHeight: 21,
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cancelButton: {
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.canvas,
  },
  cancelButtonText: {
    color: designTokens.color.ink.secondary,
    fontWeight: "800",
    fontSize: 16,
  },
  pricingBreakdown: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.surface.secondary,
  },
  pricingTotalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: designTokens.color.ink.accent,
    marginTop: 4,
    paddingTop: 12,
  },
  pricingLabel: {
    fontSize: 14,
    color: designTokens.color.ink.secondary,
    flex: 1,
  },
  pricingValue: {
    fontSize: 14,
    color: designTokens.color.ink.primary,
    fontWeight: "600",
    textAlign: "right",
  },
  pricingTotalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  pricingTotalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: designTokens.color.ink.accent,
  },
  pricingButton: {
    borderColor: designTokens.color.border.strong,
    backgroundColor: designTokens.color.surface.accent,
  },
  pricingButtonText: {
    color: designTokens.color.ink.accent,
    fontWeight: "800",
    fontSize: 16,
  },
  pricingLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  pricingLoadingText: {
    color: designTokens.color.ink.secondary,
    fontSize: 15,
  },
  pricingErrorText: {
    color: designTokens.color.ink.danger,
    fontSize: 15,
    lineHeight: 22,
  },
  pricingSuccessCard: {
    backgroundColor: designTokens.color.surface.success,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: designTokens.color.status.successText,
    gap: 12,
  },
  pricingSuccessText: {
    color: designTokens.color.status.successText,
    fontSize: 16,
    fontWeight: "800",
  },
  pricingNotesList: {
    gap: 6,
  },
  pricingNoteItem: {
    color: designTokens.color.status.successText,
    fontSize: 14,
    lineHeight: 20,
  },
  pricingDiscrepancyCard: {
    backgroundColor: designTokens.color.ink.inverse,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    gap: 0,
  },
  pricingDiscrepancyTitle: {
    color: designTokens.color.status.dangerText,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },
  pricingTableHeader: {
    flexDirection: "row",
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  pricingTableHeaderText: {
    fontWeight: "700",
    color: designTokens.color.status.dangerText,
  },
  pricingTableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  pricingTableCell: {
    flex: 1,
    fontSize: 13,
    color: designTokens.color.ink.secondary,
  },
});
