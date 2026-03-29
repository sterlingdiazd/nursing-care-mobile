import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequestDetail,
  type AdminCareRequestDetailDto,
} from "@/src/services/adminPortalService";

function formatTimestamp(value: string | null) {
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
  return status;
}

export default function AdminCareRequestDetailScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminCareRequestDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {detail && (
        <ScrollView>
          {detail.isOverdueOrStale && (
            <View style={styles.overdueAlert}>
              <Text style={styles.overdueAlertText}>⚠️ Esta solicitud está vencida o estancada</Text>
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
              <Text style={styles.fieldValue}>{statusLabel(detail.status)}</Text>
            </View>
          </View>

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
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: "#f0f4f8", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 14 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
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
});
