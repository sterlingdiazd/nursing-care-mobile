// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-CR-002
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  generateReceipt,
  getAdminCareRequestDetail,
  invoiceCareRequest,
  payCareRequest,
  voidCareRequest,
  type AdminCareRequestDetailDto,
} from "@/src/services/adminPortalService";

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function statusLabel(status: string) {
  if (status === "Pending") return "Pendiente";
  if (status === "Approved") return "Aprobado";
  if (status === "Rejected") return "Rechazado";
  if (status === "Completed") return "Completado";
  if (status === "Cancelled") return "Cancelada";
  if (status === "Invoiced") return "Facturada";
  if (status === "Paid") return "Pagada";
  if (status === "Voided") return "Anulada";
  return status;
}

function statusColor(status: string): string {
  if (status === "Paid") return "#166534";
  if (status === "Invoiced") return "#92400e";
  if (status === "Voided") return "#991b1b";
  if (status === "Completed") return "#1e3a5f";
  if (status === "Rejected" || status === "Cancelled") return "#dc2626";
  return "#102a43";
}

type BillingModal = "invoice" | "pay" | "void" | null;

export default function AdminCareRequestDetailScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminCareRequestDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Billing modal state
  const [activeModal, setActiveModal] = useState<BillingModal>(null);
  const [billingInput, setBillingInput] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminCareRequestDetail(id);
      setDetail(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle de la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, id]);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  const openModal = (modal: BillingModal) => {
    setBillingInput("");
    setActiveModal(modal);
  };

  const closeModal = () => {
    if (billingLoading) return;
    setActiveModal(null);
    setBillingInput("");
  };

  const handleInvoice = async () => {
    if (!billingInput.trim()) {
      Alert.alert("Error", "El número de factura es obligatorio.");
      return;
    }
    if (!id) return;
    try {
      setBillingLoading(true);
      await invoiceCareRequest(id, billingInput.trim());
      setActiveModal(null);
      Alert.alert("Éxito", "Solicitud facturada correctamente.");
      void load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No fue posible facturar la solicitud.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePay = async () => {
    if (!billingInput.trim()) {
      Alert.alert("Error", "La referencia bancaria es obligatoria.");
      return;
    }
    if (!id) return;
    try {
      setBillingLoading(true);
      await payCareRequest(id, billingInput.trim());
      setActiveModal(null);
      Alert.alert("Éxito", "Pago registrado correctamente.");
      void load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No fue posible registrar el pago.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!billingInput.trim()) {
      Alert.alert("Error", "El motivo de anulación es obligatorio.");
      return;
    }
    if (!id) return;
    try {
      setBillingLoading(true);
      await voidCareRequest(id, billingInput.trim());
      setActiveModal(null);
      Alert.alert("Éxito", "Solicitud anulada correctamente.");
      void load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No fue posible anular la solicitud.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleGenerateReceipt = async () => {
    if (!id) return;
    try {
      setBillingLoading(true);
      await generateReceipt(id);
      Alert.alert("Éxito", "Recibo generado correctamente.");
      void load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No fue posible generar el recibo.");
    } finally {
      setBillingLoading(false);
    }
  };

  const modalConfig: Record<
    Exclude<BillingModal, null>,
    { title: string; inputLabel: string; placeholder: string; onConfirm: () => Promise<void> }
  > = {
    invoice: {
      title: "Facturar Solicitud",
      inputLabel: "Número de factura",
      placeholder: "Ej. FAC-2024-001",
      onConfirm: handleInvoice,
    },
    pay: {
      title: "Registrar Pago",
      inputLabel: "Referencia bancaria",
      placeholder: "Ej. REF-123456",
      onConfirm: handlePay,
    },
    void: {
      title: "Anular Solicitud",
      inputLabel: "Motivo de anulación",
      placeholder: "Describa el motivo",
      onConfirm: handleVoid,
    },
  };

  const currentModal = activeModal ? modalConfig[activeModal] : null;

  return (
    <MobileWorkspaceShell
      eyebrow="Solicitud de Cuidado"
      title={detail ? `Solicitud #${detail.id.substring(0, 8)}` : "Cargando..."}
      description="Detalles completos de la solicitud de servicio."
      actions={(
        <Pressable style={styles.button} onPress={() => void load()}>
          <Text style={styles.buttonText}>Actualizar</Text>
        </Pressable>
      )}
    >
      <View
        testID="admin-care-detail-page"
        nativeID="admin-care-detail-page"
        style={styles.pageRoot}
      >
      {!loading && detail && (
        <Text
          testID="care-request-detail-loaded"
          nativeID="care-request-detail-loaded"
          style={styles.hiddenMarker}
        >
          {" "}
        </Text>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {/* Billing action modals */}
      {currentModal && (
        <Modal
          testID="billing-modal"
          nativeID="billing-modal"
          visible={activeModal !== null}
          transparent
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View
              style={styles.modalCard}
              testID={
                activeModal === "invoice"
                  ? "invoice-modal"
                  : activeModal === "pay"
                  ? "payment-modal"
                  : "void-modal"
              }
              nativeID={
                activeModal === "invoice"
                  ? "invoice-modal"
                  : activeModal === "pay"
                  ? "payment-modal"
                  : "void-modal"
              }
            >
              <Text style={styles.modalTitle}>{currentModal.title}</Text>
              <Text style={styles.modalInputLabel}>{currentModal.inputLabel}</Text>
              <TextInput
                testID={
                  activeModal === "invoice"
                    ? "invoice-number-input"
                    : activeModal === "pay"
                    ? "bank-reference-input"
                    : "void-reason-input"
                }
                nativeID={
                  activeModal === "invoice"
                    ? "invoice-number-input"
                    : activeModal === "pay"
                    ? "bank-reference-input"
                    : "void-reason-input"
                }
                style={styles.modalInput}
                placeholder={currentModal.placeholder}
                value={billingInput}
                onChangeText={setBillingInput}
                editable={!billingLoading}
                autoFocus
              />
              <View style={styles.modalActions}>
                <Pressable
                  testID="billing-modal-cancel"
                  nativeID="billing-modal-cancel"
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={closeModal}
                  disabled={billingLoading}
                >
                  <Text style={styles.modalButtonSecondaryText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  testID={
                    activeModal === "invoice"
                      ? "invoice-submit-button"
                      : activeModal === "pay"
                      ? "payment-submit-button"
                      : "void-submit-button"
                  }
                  nativeID={
                    activeModal === "invoice"
                      ? "invoice-submit-button"
                      : activeModal === "pay"
                      ? "payment-submit-button"
                      : "void-submit-button"
                  }
                  style={[styles.modalButton, styles.modalButtonPrimary, billingLoading && styles.modalButtonDisabled]}
                  onPress={() => void currentModal.onConfirm()}
                  disabled={billingLoading}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    {billingLoading ? "Procesando..." : "Confirmar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {detail && (
        <ScrollView
          testID="admin-care-request-detail-page"
          nativeID="admin-care-request-detail-page"
        >
          {detail.isOverdueOrStale && (
            <View style={styles.overdueAlert}>
              <Text style={styles.overdueAlertText}>Esta solicitud está vencida o estancada</Text>
            </View>
          )}

          {/* Client Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información del Cliente</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Pressable onPress={() => router.push(`/admin/clients/${detail.clientUserId}` as any)}>
                <Text style={styles.fieldValueLink}>{detail.clientDisplayName}</Text>
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo</Text>
              <Text style={styles.fieldValue}>{detail.clientEmail}</Text>
            </View>
            {detail.clientIdentificationNumber && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Cédula</Text>
                <Text style={styles.fieldValue}>{detail.clientIdentificationNumber}</Text>
              </View>
            )}
          </View>

          {/* Nurse Assignment */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Asignación de Enfermera</Text>
            {detail.assignedNurseDisplayName ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Enfermera</Text>
                  <Pressable onPress={() => router.push(`/admin/nurse-profiles/${detail.assignedNurseUserId}` as any)}>
                    <Text style={styles.fieldValueLink}>{detail.assignedNurseDisplayName}</Text>
                  </Pressable>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Correo</Text>
                  <Text style={styles.fieldValue}>{detail.assignedNurseEmail}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.unassigned}>Sin enfermera asignada</Text>
            )}
            {detail.suggestedNurse && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Enfermera sugerida</Text>
                <Text style={styles.fieldValue}>{detail.suggestedNurse}</Text>
              </View>
            )}
          </View>

          {/* Request Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalles de la Solicitud</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Descripción</Text>
              <Text style={styles.fieldValue}>{detail.careRequestDescription}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <Text style={styles.fieldValue}>{detail.careRequestType}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Unidades</Text>
              <Text style={styles.fieldValue}>{detail.unit} {detail.unitType}</Text>
            </View>
            {detail.careRequestDate && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Fecha programada</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.careRequestDate)}</Text>
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Estado</Text>
              <Text
                testID="care-request-status-badge"
                nativeID="care-request-status-badge"
                style={[styles.statusBadge, { color: statusColor(detail.status) }]}
              >
                {statusLabel(detail.status)}
              </Text>
            </View>
          </View>

          {/* Billing Info Card — shown when any billing data exists */}
          {(detail.invoiceNumber || detail.bankReference || detail.voidReason || detail.receiptNumber) && (
            <View style={styles.card} testID="billing-info-card">
              <Text style={styles.cardTitle}>Información de Facturación</Text>
              {detail.invoiceNumber && (
                <View testID="invoice-details-section" nativeID="invoice-details-section">
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Número de factura</Text>
                    <Text style={styles.fieldValue}>{detail.invoiceNumber}</Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Fecha de facturación</Text>
                    <Text style={styles.fieldValue}>{formatTimestamp(detail.invoicedAtUtc)}</Text>
                  </View>
                </View>
              )}
              {detail.bankReference && (
                <View testID="payment-details-section" nativeID="payment-details-section">
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Referencia bancaria</Text>
                    <Text style={styles.fieldValue}>{detail.bankReference}</Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Fecha de pago</Text>
                    <Text style={styles.fieldValue}>{formatTimestamp(detail.paidAtUtc)}</Text>
                  </View>
                </View>
              )}
              {detail.voidReason && (
                <View testID="void-details-section" nativeID="void-details-section">
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Motivo de anulación</Text>
                    <Text style={styles.fieldValue}>{detail.voidReason}</Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Fecha de anulación</Text>
                    <Text style={styles.fieldValue}>{formatTimestamp(detail.voidedAtUtc)}</Text>
                  </View>
                </View>
              )}
              {detail.receiptNumber && (
                <View testID="receipt-details-section" nativeID="receipt-details-section">
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Número de recibo</Text>
                    <Text
                      testID="receipt-number-display"
                      nativeID="receipt-number-display"
                      style={styles.fieldValue}
                    >
                      {detail.receiptNumber}
                    </Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Fecha de recibo</Text>
                    <Text style={styles.fieldValue}>{formatTimestamp(detail.receiptGeneratedAtUtc)}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Billing Action Buttons */}
          {detail.status === "Completed" && (
            <View style={styles.actionsCard} testID="billing-actions-completed">
              <Pressable
                testID="invoice-care-request-button"
                nativeID="invoice-care-request-button"
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => openModal("invoice")}
                disabled={billingLoading}
              >
                <Text style={styles.actionButtonPrimaryText}>Facturar</Text>
              </Pressable>
            </View>
          )}

          {detail.status === "Invoiced" && (
            <View style={styles.actionsCard} testID="billing-actions-invoiced">
              <Pressable
                testID="pay-care-request-button"
                nativeID="pay-care-request-button"
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => openModal("pay")}
                disabled={billingLoading}
              >
                <Text style={styles.actionButtonPrimaryText}>Registrar Pago</Text>
              </Pressable>
              <Pressable
                testID="void-care-request-button"
                nativeID="void-care-request-button"
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => openModal("void")}
                disabled={billingLoading}
              >
                <Text style={styles.actionButtonDangerText}>Anular</Text>
              </Pressable>
            </View>
          )}

          {detail.status === "Paid" && (
            <View style={styles.actionsCard} testID="billing-actions-paid">
              <Pressable
                testID="generate-receipt-button"
                nativeID="generate-receipt-button"
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => void handleGenerateReceipt()}
                disabled={billingLoading}
              >
                <Text style={styles.actionButtonPrimaryText}>
                  {billingLoading ? "Procesando..." : "Generar Recibo"}
                </Text>
              </Pressable>
              <Pressable
                testID="btn-anular-paid"
                nativeID="btn-anular-paid"
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => openModal("void")}
                disabled={billingLoading}
              >
                <Text style={styles.actionButtonDangerText}>Anular</Text>
              </Pressable>
            </View>
          )}

          {/* Pricing Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Desglose de Precios</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Categoría</Text>
              <Text style={styles.fieldValue}>{detail.pricingBreakdown.category}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Precio base</Text>
              <Text style={styles.fieldValue}>{formatCurrency(detail.pricingBreakdown.basePrice)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Factor de categoría</Text>
              <Text style={styles.fieldValue}>{detail.pricingBreakdown.categoryFactor}</Text>
            </View>
            {detail.pricingBreakdown.distanceFactor && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Factor de distancia</Text>
                <Text style={styles.fieldValue}>{detail.pricingBreakdown.distanceFactor} (×{detail.pricingBreakdown.distanceFactorValue})</Text>
              </View>
            )}
            {detail.pricingBreakdown.complexityLevel && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nivel de complejidad</Text>
                <Text style={styles.fieldValue}>{detail.pricingBreakdown.complexityLevel} (×{detail.pricingBreakdown.complexityFactorValue})</Text>
              </View>
            )}
            {detail.pricingBreakdown.volumeDiscountPercent > 0 && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Descuento por volumen</Text>
                <Text style={styles.fieldValue}>{detail.pricingBreakdown.volumeDiscountPercent}%</Text>
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Subtotal antes de suministros</Text>
              <Text style={styles.fieldValue}>{formatCurrency(detail.pricingBreakdown.subtotalBeforeSupplies)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Costo de suministros médicos</Text>
              <Text style={styles.fieldValue}>{formatCurrency(detail.pricingBreakdown.medicalSuppliesCost)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Total</Text>
              <Text style={[styles.fieldValue, styles.totalValue]}>{formatCurrency(detail.pricingBreakdown.total)}</Text>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Línea de Tiempo</Text>
            {detail.timeline.length === 0 ? (
              <Text style={styles.emptyText}>No hay eventos en la línea de tiempo.</Text>
            ) : (
              detail.timeline.map((event) => (
                <View key={event.id} style={styles.timelineEvent}>
                  <Text style={styles.timelineTimestamp}>{formatTimestamp(event.occurredAtUtc)}</Text>
                  <Text style={styles.timelineTitle}>{event.title}</Text>
                  <Text style={styles.timelineDescription}>{event.description}</Text>
                </View>
              ))
            )}
          </View>

          {/* Dates */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fechas</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Creada</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(detail.createdAtUtc)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Actualizada</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(detail.updatedAtUtc)}</Text>
            </View>
            {detail.approvedAtUtc && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Aprobada</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.approvedAtUtc)}</Text>
              </View>
            )}
            {detail.rejectedAtUtc && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Rechazada</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.rejectedAtUtc)}</Text>
              </View>
            )}
            {detail.completedAtUtc && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Completada</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.completedAtUtc)}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: "#f0f4f8", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 14 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  pageRoot: { flex: 1 },
  hiddenMarker: { height: 0, width: 0, opacity: 0 },
  overdueAlert: { backgroundColor: "#fef3c7", borderRadius: 12, padding: 12, marginBottom: 12 },
  overdueAlertText: { color: "#92400e", fontSize: 14, fontWeight: "700", textAlign: "center" },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#102a43", marginBottom: 12 },
  field: { marginBottom: 8 },
  fieldLabel: { color: "#7c2d12", fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  fieldValue: { color: "#102a43", fontSize: 15 },
  fieldValueLink: { color: "#3b82f6", fontSize: 15, textDecorationLine: "underline" },
  totalValue: { fontSize: 18, fontWeight: "800" },
  unassigned: { color: "#dc2626", fontSize: 14, fontStyle: "italic" },
  emptyText: { color: "#52637a", fontSize: 14, fontStyle: "italic" },
  timelineEvent: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  timelineTimestamp: { color: "#7c2d12", fontSize: 11, fontWeight: "700", marginBottom: 2 },
  timelineTitle: { color: "#102a43", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  timelineDescription: { color: "#52637a", fontSize: 13 },
  // Status badge
  statusBadge: { fontSize: 15, fontWeight: "700" },
  // Billing actions card
  actionsCard: { backgroundColor: "#f0f7ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 18, padding: 14, marginBottom: 12, gap: 10 },
  actionButton: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  actionButtonPrimary: { backgroundColor: "#1e40af" },
  actionButtonPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  actionButtonDanger: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fca5a5" },
  actionButtonDangerText: { color: "#991b1b", fontWeight: "700", fontSize: 15 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 24, width: "100%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#102a43", marginBottom: 16 },
  modalInputLabel: { color: "#7c2d12", fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#102a43", marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalButton: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  modalButtonPrimary: { backgroundColor: "#1e40af" },
  modalButtonPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalButtonSecondary: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1" },
  modalButtonSecondaryText: { color: "#475569", fontWeight: "700", fontSize: 15 },
  modalButtonDisabled: { opacity: 0.6 },
});
