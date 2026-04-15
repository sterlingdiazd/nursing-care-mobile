import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminClientDetail,
  updateAdminClientActiveState,
  type AdminClientDetailDto,
  type AdminCareRequestStatus,
} from "@/src/services/adminPortalService";
import { mobileAdminActionButton, mobileAdminActionButtonText } from "@/src/design-system/mobileStyles";

function formatTimestamp(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function statusLabel(status: AdminCareRequestStatus) {
  if (status === "Pending") return "Pendiente";
  if (status === "Approved") return "Aprobado";
  if (status === "Rejected") return "Rechazado";
  if (status === "Completed") return "Completado";
  return status;
}

export default function AdminClientDetailScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminClientDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminClientDetail(id);
      setDetail(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle del cliente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, id]);

  const handleToggleActiveState = async () => {
    if (!detail) return;
    try {
      setToggling(true);
      const newState = !detail.isActive;
      // Optimistic update
      setDetail({ ...detail, isActive: newState });
      await updateAdminClientActiveState(detail.userId, newState);
    } catch (err) {
      // Revert on failure
      setDetail((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
      setError(err instanceof Error ? err.message : "No fue posible cambiar el estado del cliente.");
    } finally {
      setToggling(false);
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Clientes"
      title={detail ? detail.displayName : "Cargando..."}
      description="Información completa del cliente y su historial de solicitudes."
      actions={(
        <View style={styles.headerActions}>
          <Pressable style={styles.button} onPress={() => void load()}>
            <Text style={styles.buttonText}>Actualizar</Text>
          </Pressable>
        </View>
      )}
    >
      {!!error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      )}
      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {detail && (
        <ScrollView>
          {/* Personal Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Personal</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre completo</Text>
              <Text style={styles.fieldValue}>{detail.displayName}</Text>
            </View>
            {detail.name && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nombre</Text>
                <Text style={styles.fieldValue}>{detail.name}</Text>
              </View>
            )}
            {detail.lastName && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Apellido</Text>
                <Text style={styles.fieldValue}>{detail.lastName}</Text>
              </View>
            )}
            {detail.identificationNumber && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Cédula</Text>
                <Text style={styles.fieldValue}>{detail.identificationNumber}</Text>
              </View>
            )}
          </View>

          {/* Contact Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información de Contacto</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo electrónico</Text>
              <Text style={styles.fieldValue}>{detail.email}</Text>
            </View>
            {detail.phone && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Teléfono</Text>
                <Text style={styles.fieldValue}>{detail.phone}</Text>
              </View>
            )}
          </View>

          {/* Account Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado de la Cuenta</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Estado</Text>
              <View style={[styles.statusBadge, detail.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, detail.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                  {detail.isActive ? "Activo" : "Inactivo"}
                </Text>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Total de solicitudes</Text>
              <Text style={styles.fieldValue}>{detail.ownedCareRequestsCount}</Text>
            </View>
            {detail.lastCareRequestAtUtc && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Última solicitud</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.lastCareRequestAtUtc)}</Text>
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha de registro</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(detail.createdAtUtc)}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Acciones</Text>
            <Pressable
              style={styles.buttonSecondary}
              onPress={() => router.push(`/admin/clients/${id}/edit` as never)}
            >
              <Text style={styles.buttonSecondaryText}>Editar cliente</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, toggling && styles.buttonDisabled]}
              onPress={handleToggleActiveState}
              disabled={toggling}
            >
              <Text style={styles.toggleButtonText}>
                {toggling ? "Cambiando..." : detail.isActive ? "Desactivar cliente" : "Activar cliente"}
              </Text>
            </Pressable>
            {detail.canAdminCreateCareRequest && (
              <Pressable
                style={styles.buttonPrimary}
                onPress={() => router.push(`/admin/care-requests/create?clientUserId=${detail.userId}` as never)}
              >
                <Text style={styles.buttonPrimaryText}>Crear solicitud de cuidado</Text>
              </Pressable>
            )}
          </View>

          {/* Care Request History */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Historial de Solicitudes</Text>
            {detail.careRequestHistory.length === 0 ? (
              <Text style={styles.emptyText}>No hay solicitudes registradas.</Text>
            ) : (
              detail.careRequestHistory.map((item) => (
                <Pressable
                  key={item.careRequestId}
                  style={styles.historyItem}
                  onPress={() => router.push(`/admin/care-requests/${item.careRequestId}` as never)}
                >
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDescription} numberOfLines={2}>{item.careRequestDescription}</Text>
                    <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                      <Text style={[styles.statusBadgeText, getStatusTextStyle(item.status)]}>
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>Tipo:</Text>
                    <Text style={styles.historyValue}>{item.careRequestType}</Text>
                  </View>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>Total:</Text>
                    <Text style={styles.historyValue}>{formatCurrency(item.total)}</Text>
                  </View>
                  {item.careRequestDate && (
                    <View style={styles.historyRow}>
                      <Text style={styles.historyLabel}>Fecha programada:</Text>
                      <Text style={styles.historyValue}>{formatTimestamp(item.careRequestDate)}</Text>
                    </View>
                  )}
                  {item.assignedNurseDisplayName && (
                    <View style={styles.historyRow}>
                      <Text style={styles.historyLabel}>Enfermera:</Text>
                      <Text style={styles.historyValue}>{item.assignedNurseDisplayName}</Text>
                    </View>
                  )}
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>Creada:</Text>
                    <Text style={styles.historyValue}>{formatTimestamp(item.createdAtUtc)}</Text>
                  </View>

                  <Text style={styles.historyTapHint}>Toca para ver detalles →</Text>
                </Pressable>
              ))
            )}
          </View>

          {/* System Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información del Sistema</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ID de usuario</Text>
              <Text style={styles.fieldValueMono}>{detail.userId}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </MobileWorkspaceShell>
  );
}

function getStatusStyle(status: AdminCareRequestStatus) {
  if (status === "Approved") return styles.statusBadgeActive;
  if (status === "Rejected") return styles.statusBadgeDanger;
  if (status === "Completed") return styles.statusBadgeCompleted;
  return styles.statusBadgePending;
}

function getStatusTextStyle(status: AdminCareRequestStatus) {
  if (status === "Approved") return styles.statusBadgeTextActive;
  if (status === "Rejected") return styles.statusBadgeTextDanger;
  if (status === "Completed") return styles.statusBadgeTextCompleted;
  return styles.statusBadgeTextPending;
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 8 },
  button: { backgroundColor: "#f0f4f8", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 14 },
  buttonPrimary: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 8 },
  buttonPrimaryText: { ...mobileAdminActionButtonText },
  buttonSecondary: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 4 },
  buttonSecondaryText: { ...mobileAdminActionButtonText },
  buttonDisabled: { opacity: 0.5 },
  toggleButton: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 8 },
  toggleButtonText: { ...mobileAdminActionButtonText },
  errorCard: { backgroundColor: "#fee", borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: "#c00", fontSize: 14, marginBottom: 8 },
  retryButton: { backgroundColor: "#c00", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: "flex-start" },
  retryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  loading: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#102a43", marginBottom: 12 },
  field: { marginBottom: 8 },
  fieldLabel: { color: "#7c2d12", fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  fieldValue: { color: "#102a43", fontSize: 15 },
  fieldValueMono: { color: "#102a43", fontSize: 13, fontFamily: "monospace" },
  emptyText: { color: "#52637a", fontSize: 14, fontStyle: "italic" },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  statusBadgeActive: { backgroundColor: "#d1fae5" },
  statusBadgeInactive: { backgroundColor: "#fee2e2" },
  statusBadgeDanger: { backgroundColor: "#fee2e2" },
  statusBadgePending: { backgroundColor: "#fef3c7" },
  statusBadgeCompleted: { backgroundColor: "#dbeafe" },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadgeTextActive: { color: "#065f46" },
  statusBadgeTextInactive: { color: "#991b1b" },
  statusBadgeTextDanger: { color: "#991b1b" },
  statusBadgeTextPending: { color: "#92400e" },
  statusBadgeTextCompleted: { color: "#1e40af" },
  historyItem: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, marginBottom: 10 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 },
  historyDescription: { color: "#102a43", fontSize: 14, fontWeight: "700", flex: 1 },
  historyRow: { flexDirection: "row", marginBottom: 4 },
  historyLabel: { color: "#7c2d12", fontSize: 12, fontWeight: "700", width: 130 },
  historyValue: { color: "#102a43", fontSize: 12, flex: 1 },
  historyTapHint: { color: "#3b82f6", fontSize: 11, marginTop: 6, textAlign: "right" },
});
