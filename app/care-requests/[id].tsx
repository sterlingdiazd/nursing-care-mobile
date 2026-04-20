import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

function getStatusColors(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved":
      return { bg: "#dcfce7", fg: "#166534" };
    case "Rejected":
      return { bg: "#fee2e2", fg: "#991b1b" };
    case "Completed":
      return { bg: "#dbeafe", fg: "#1d4ed8" };
    case "Cancelled":
      return { bg: "#f1f5f9", fg: "#475569" };
    default:
      return { bg: "#fef3c7", fg: "#92400e" };
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
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
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
    setPricingModalVisible(true);
    try {
      const result = await verifyCareRequestPricing(id);
      setPricingResult(result);
    } catch (nextError: any) {
      setPricingError(nextError.message ?? "No fue posible verificar los precios.");
    } finally {
      setIsPricingLoading(false);
    }
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
        <ActivityIndicator color="#1d4ed8" />
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

  return (
    <>
    <MobileWorkspaceShell
      eyebrow="Detalle de solicitud"
      title="Revisa contexto, estado y transiciones."
      description="El detalle concentra la lectura operativa y las acciones permitidas segun el rol actual."
      actions={
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backActionButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.backActionButtonText}>Volver a la cola</Text>
        </Pressable>
      }
    >
      <View style={styles.card} testID="care-detail-page" nativeID="care-detail-page">
        <Text style={styles.eyebrow}>Detalle de solicitud</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{careRequest.careRequestDescription}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]} testID="care-detail-status-chip" nativeID="care-detail-status-chip">
            <Text style={[styles.statusText, { color: colors.fg }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.metaGroup} testID="care-detail-info-section" nativeID="care-detail-info-section">
          <Text style={styles.metaText}>ID de solicitud: {careRequest.id}</Text>
          <Text style={styles.metaText}>ID de usuario: {careRequest.userID}</Text>
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
            Creada: {new Date(careRequest.createdAtUtc).toLocaleString()}
          </Text>
          <Text style={styles.metaText}>
            Actualizada: {new Date(careRequest.updatedAtUtc).toLocaleString()}
          </Text>
          {careRequest.approvedAtUtc && (
            <Text style={styles.metaText}>
              Aprobada: {new Date(careRequest.approvedAtUtc).toLocaleString()}
            </Text>
          )}
          {careRequest.rejectedAtUtc && (
            <Text style={styles.metaText}>
              Rechazada: {new Date(careRequest.rejectedAtUtc).toLocaleString()}
            </Text>
          )}
          {careRequest.rejectionReason && (
            <Text style={styles.metaText}>
              Razon de rechazo: {careRequest.rejectionReason}
            </Text>
          )}
          {careRequest.completedAtUtc && (
            <Text style={styles.metaText}>
              Completada: {new Date(careRequest.completedAtUtc).toLocaleString()}
            </Text>
          )}
          {careRequest.cancelledAtUtc && (
            <Text style={styles.metaText}>
              Cancelada: {new Date(careRequest.cancelledAtUtc).toLocaleString()}
            </Text>
          )}
        </View>

        {hasPricingData && (
          <View style={styles.pricingBreakdown} testID="care-detail-pricing-breakdown" nativeID="care-detail-pricing-breakdown">
            <Text style={styles.sectionEyebrow}>Desglose de precios</Text>
            <View testID="price-breakdown-category" nativeID="price-breakdown-category" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Categoria</Text>
              <Text style={styles.pricingValue}>{careRequest.pricingCategoryCode ?? careRequest.careRequestType ?? "N/A"}</Text>
            </View>
            <View testID="price-breakdown-base-price" nativeID="price-breakdown-base-price" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Precio base</Text>
              <Text style={styles.pricingValue}>{formatCurrency(careRequest.price)}</Text>
            </View>
            <View testID="price-breakdown-category-factor" nativeID="price-breakdown-category-factor" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Factor de categoria</Text>
              <Text style={styles.pricingValue}>{formatFactor(careRequest.categoryFactorSnapshot)}</Text>
            </View>
            <View testID="price-breakdown-distance-factor" nativeID="price-breakdown-distance-factor" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Factor de distancia</Text>
              <Text style={styles.pricingValue}>{formatFactor(careRequest.distanceFactorMultiplierSnapshot)}</Text>
            </View>
            <View testID="price-breakdown-complexity-factor" nativeID="price-breakdown-complexity-factor" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Factor de complejidad</Text>
              <Text style={styles.pricingValue}>{formatFactor(careRequest.complexityMultiplierSnapshot)}</Text>
            </View>
            <View testID="price-breakdown-client-base-price" nativeID="price-breakdown-client-base-price" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Precio base del cliente</Text>
              <Text style={styles.pricingValue}>{formatCurrency(careRequest.clientBasePrice)}</Text>
            </View>
            <View testID="price-breakdown-line-before-discount" nativeID="price-breakdown-line-before-discount" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Linea antes de descuento</Text>
              <Text style={styles.pricingValue}>{formatCurrency(careRequest.lineBeforeVolumeDiscount)}</Text>
            </View>
            <View testID="price-breakdown-volume-discount" nativeID="price-breakdown-volume-discount" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Descuento por volumen</Text>
              <Text style={styles.pricingValue}>{formatPercent(careRequest.volumeDiscountPercentSnapshot)}</Text>
            </View>
            <View testID="price-breakdown-unit-price-after-discount" nativeID="price-breakdown-unit-price-after-discount" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Precio unitario tras descuento</Text>
              <Text style={styles.pricingValue}>{formatCurrency(careRequest.unitPriceAfterVolumeDiscount)}</Text>
            </View>
            <View testID="price-breakdown-subtotal-before-supplies" nativeID="price-breakdown-subtotal-before-supplies" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Subtotal antes de insumos</Text>
              <Text style={styles.pricingValue}>{formatCurrency(careRequest.subtotalBeforeSupplies)}</Text>
            </View>
            <View testID="price-breakdown-medical-supplies" nativeID="price-breakdown-medical-supplies" style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Insumos medicos</Text>
              <Text style={styles.pricingValue}>{formatCurrency(careRequest.medicalSuppliesCost)}</Text>
            </View>
            <View testID="price-breakdown-total" nativeID="price-breakdown-total" style={[styles.pricingRow, styles.pricingTotalRow]}>
              <Text style={[styles.pricingLabel, styles.pricingTotalLabel]}>Total</Text>
              <Text style={[styles.pricingValue, styles.pricingTotalValue]}>{formatCurrency(careRequest.total)}</Text>
            </View>
          </View>
        )}

        {successMessage && <Text style={styles.successText}>{successMessage}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}

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
            >
              <Text style={styles.primaryButtonText}>
                {careRequest.assignedNurse ? "Reasignar enfermera" : "Asignar enfermera"}
              </Text>
            </Pressable>
          </View>
        )}

        {roles.includes("ADMIN") && (
          <View style={styles.pricingSection}>
            <Pressable
              onPress={runPricingVerification}
              testID="verify-pricing-btn"
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.pricingButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.pricingButtonText}>Verificar precios</Text>
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
            >
              <Text style={styles.cancelButtonText}>Cancelar solicitud</Text>
            </Pressable>
          )}
        </View>
      </View>
    </MobileWorkspaceShell>

    <Modal
      visible={pricingModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setPricingModalVisible(false)}
    >
      <View style={styles.pricingModalContainer}>
        <View style={styles.pricingModalHeader}>
          <Text style={styles.pricingModalTitle}>Verificacion de precios</Text>
          <Pressable
            onPress={() => setPricingModalVisible(false)}
            style={({ pressed }) => [pressed && styles.buttonPressed]}
          >
            <Text style={styles.pricingModalClose}>Cerrar</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.pricingModalBody}>
          {isPricingLoading && (
            <View style={styles.pricingLoadingRow}>
              <ActivityIndicator color="#1d4ed8" />
              <Text style={styles.pricingLoadingText}>Verificando precios...</Text>
            </View>
          )}

          {pricingError && (
            <Text style={styles.pricingErrorText}>{pricingError}</Text>
          )}

          {pricingResult && pricingResult.matches && (
            <View style={styles.pricingSuccessCard}>
              <Text style={styles.pricingSuccessText}>Todos los valores coinciden</Text>
              {pricingResult.limitationNotes.length > 0 && (
                <View style={styles.pricingNotesList}>
                  {pricingResult.limitationNotes.map((note, i) => (
                    <Text key={i} style={styles.pricingNoteItem}>{note}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {pricingResult && !pricingResult.matches && (
            <View style={styles.pricingDiscrepancyCard}>
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
          )}
        </ScrollView>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef3fb",
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
    color: "#f8fafc",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fffdf9",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  eyebrow: {
    color: "#2563eb",
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
  title: {
    color: "#102a43",
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
  assignmentCard: {
    marginTop: 24,
    gap: 12,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  sectionEyebrow: {
    color: "#2563eb",
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: 12,
  },
  assignmentCopy: {
    color: "#52637a",
    lineHeight: 21,
  },
  assignmentEmpty: {
    color: "#7c2d12",
    lineHeight: 21,
  },
  nurseList: {
    gap: 10,
    paddingRight: 8,
  },
  nurseChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d7e3fb",
    backgroundColor: "#eef4ff",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nurseChipSelected: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  nurseChipText: {
    color: "#163561",
    fontWeight: "700",
  },
  nurseChipTextSelected: {
    color: "#fff",
  },
  metaText: {
    color: "#334e68",
    lineHeight: 21,
  },
  assignmentWarning: {
    color: "#92400e",
    lineHeight: 21,
  },
  actionRow: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  successButton: {
    backgroundColor: "#166534",
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecdd3",
    backgroundColor: "#fff1f2",
  },
  rejectButton: {
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
  },
  buttonPressed: {
    opacity: 0.92,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: "#be123c",
    fontWeight: "800",
    fontSize: 16,
  },
  successText: {
    color: "#166534",
    marginTop: 16,
    lineHeight: 21,
    fontWeight: "700",
  },
  errorText: {
    color: "#be123c",
    marginTop: 16,
    lineHeight: 21,
  },
  cancelButton: {
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  cancelButtonText: {
    color: "#475569",
    fontWeight: "800",
    fontSize: 16,
  },
  pricingBreakdown: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pricingTotalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: "#1d4ed8",
    marginTop: 4,
    paddingTop: 12,
  },
  pricingLabel: {
    fontSize: 14,
    color: "#475569",
    flex: 1,
  },
  pricingValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
    textAlign: "right",
  },
  pricingTotalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  pricingTotalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  pricingSection: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  pricingButton: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  pricingButtonText: {
    color: "#1d4ed8",
    fontWeight: "800",
    fontSize: 16,
  },
  pricingModalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  pricingModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  pricingModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102a43",
  },
  pricingModalClose: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "600",
  },
  pricingModalBody: {
    flex: 1,
    padding: 20,
  },
  pricingLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  pricingLoadingText: {
    color: "#52637a",
    fontSize: 15,
  },
  pricingErrorText: {
    color: "#be123c",
    fontSize: 15,
    lineHeight: 22,
  },
  pricingSuccessCard: {
    backgroundColor: "#dcfce7",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 12,
  },
  pricingSuccessText: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "800",
  },
  pricingNotesList: {
    gap: 6,
  },
  pricingNoteItem: {
    color: "#166534",
    fontSize: 14,
    lineHeight: 20,
  },
  pricingDiscrepancyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 0,
  },
  pricingDiscrepancyTitle: {
    color: "#991b1b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },
  pricingTableHeader: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  pricingTableHeaderText: {
    fontWeight: "700",
    color: "#991b1b",
  },
  pricingTableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
  },
  pricingTableCell: {
    flex: 1,
    fontSize: 13,
    color: "#334e68",
  },
});
