import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  getAdminClientDetail,
  updateAdminClientActiveState,
  type AdminClientDetailDto,
  type AdminCareRequestStatus,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

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
  }, [id, isAuthenticated, isReady, requiresProfileCompletion, roles]);

  const handleToggleActiveState = async () => {
    if (!detail) return;

    try {
      setToggling(true);
      const nextState = !detail.isActive;
      setDetail({ ...detail, isActive: nextState });
      await updateAdminClientActiveState(detail.userId, nextState);
    } catch (nextError) {
      setDetail((current) => (current ? { ...current, isActive: !current.isActive } : current));
      setError(nextError instanceof Error ? nextError.message : "No fue posible cambiar el estado del cliente.");
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
      title={detail?.displayName || "Cargando..."}
      description="Consolida identidad, actividad y próximos pasos del cliente."
      testID={adminTestIds.clients.detailScreen}
      nativeID={adminTestIds.clients.detailScreen}
      primaryReturnPath={mobileNavigationEscapes.adminClients}
      primaryReturnLabel="Volver a clientes"
      actions={detail ? (
        <View style={styles.headerActions}>
          <Pressable style={styles.buttonSecondary} onPress={() => void load()}>
            <Text style={styles.buttonSecondaryText}>Actualizar</Text>
          </Pressable>
          <Pressable
            style={styles.buttonPrimary}
            onPress={() => router.push(`/admin/clients/${id}/edit` as never)}
            testID={adminTestIds.clients.detailPrimaryAction}
            nativeID={adminTestIds.clients.detailPrimaryAction}
          >
            <Text style={styles.buttonPrimaryText}>Editar</Text>
          </Pressable>
        </View>
      ) : undefined}
    >
      {!!error && (
        <Text
          style={styles.errorBanner}
          testID={adminTestIds.clients.detailErrorBanner}
          nativeID={adminTestIds.clients.detailErrorBanner}
        >
          {error}
        </Text>
      )}

      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {detail ? (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.summaryCard}>
            <Text
              style={styles.summaryChip}
              testID={adminTestIds.clients.detailStatusChip}
              nativeID={adminTestIds.clients.detailStatusChip}
            >
              {detail.isActive ? "Cuenta activa" : "Cuenta inactiva"} • {detail.ownedCareRequestsCount} solicitudes
            </Text>
            <Text style={styles.summaryText}>
              {detail.lastCareRequestAtUtc
                ? `Última solicitud ${formatTimestamp(detail.lastCareRequestAtUtc)}`
                : "Sin solicitudes registradas todavía."}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Identidad y contacto</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Text style={styles.fieldValue}>{detail.displayName}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo</Text>
              <Text style={styles.fieldValue}>{detail.email}</Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.fieldLabel}>Cédula</Text>
                <Text style={styles.fieldValue}>{detail.identificationNumber || "N/A"}</Text>
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.fieldLabel}>Teléfono</Text>
                <Text style={styles.fieldValue}>{detail.phone || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.fieldLabel}>Registro</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.createdAtUtc)}</Text>
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.fieldLabel}>Estado</Text>
                <View style={[styles.statusBadge, detail.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                  <Text style={[styles.statusBadgeText, detail.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                    {detail.isActive ? "Activo" : "Inactivo"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Acciones operativas</Text>
            <Text style={styles.actionHint}>
              Actualiza el estado del cliente o crea una nueva solicitud directamente desde esta ficha.
            </Text>

            <Pressable style={styles.buttonToggle} onPress={handleToggleActiveState} disabled={toggling}>
              <Text style={styles.buttonToggleText}>
                {toggling ? "Actualizando..." : detail.isActive ? "Desactivar cliente" : "Activar cliente"}
              </Text>
            </Pressable>

            {detail.canAdminCreateCareRequest ? (
              <Pressable
                style={styles.buttonPrimary}
                onPress={() => router.push(`/admin/care-requests/create?clientUserId=${detail.userId}` as never)}
              >
                <Text style={styles.buttonPrimaryText}>Crear solicitud</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Historial</Text>

            {detail.careRequestHistory.length === 0 ? (
              <Text style={styles.emptyState}>No hay solicitudes registradas.</Text>
            ) : (
              detail.careRequestHistory.map((item) => (
                <Pressable
                  key={item.careRequestId}
                  style={styles.historyItem}
                  onPress={() => router.push(`/admin/care-requests/${item.careRequestId}` as never)}
                >
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>{item.careRequestDescription}</Text>
                    <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                      <Text style={[styles.statusBadgeText, getStatusTextStyle(item.status)]}>{statusLabel(item.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyMeta}>
                    {item.careRequestDate ? formatTimestamp(item.careRequestDate) : "Fecha pendiente"} • {formatCurrency(item.total)}
                  </Text>
                  {item.assignedNurseDisplayName ? (
                    <Text style={styles.historyNurse}>Enfermera: {item.assignedNurseDisplayName}</Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sistema</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ID de usuario</Text>
              <Text style={styles.fieldValueMono}>{detail.userId}</Text>
            </View>
          </View>
        </ScrollView>
      ) : null}
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
  container: { padding: designTokens.spacing.md },
  headerActions: { flexDirection: "row", gap: designTokens.spacing.sm },
  summaryCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  },
  summaryChip: {
    ...designTokens.typography.label,
    alignSelf: "flex-start",
    backgroundColor: designTokens.color.status.infoBg,
    color: designTokens.color.status.infoText,
    borderRadius: designTokens.radius.pill,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.xs,
  },
  summaryText: { ...designTokens.typography.body, color: designTokens.color.ink.muted },
  card: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  },
  sectionTitle: { ...designTokens.typography.sectionTitle, fontSize: 16, marginBottom: designTokens.spacing.sm },
  field: { marginBottom: designTokens.spacing.sm },
  fieldRow: { flexDirection: "row", gap: designTokens.spacing.md },
  fieldColumn: { flex: 1 },
  fieldLabel: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.xs,
  },
  fieldValue: { ...designTokens.typography.body, fontWeight: "600" },
  fieldValueMono: { ...designTokens.typography.body, fontFamily: "monospace" },
  actionHint: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.sm,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: designTokens.color.ink.accentStrong,
    borderRadius: designTokens.radius.md,
    paddingVertical: designTokens.spacing.sm,
    alignItems: "center",
  },
  buttonPrimaryText: { ...designTokens.typography.label, color: designTokens.color.surface.primary },
  buttonSecondary: {
    flex: 1,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md,
    paddingVertical: designTokens.spacing.sm,
    alignItems: "center",
  },
  buttonSecondaryText: { ...designTokens.typography.label, color: designTokens.color.ink.primary },
  buttonToggle: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md,
    paddingVertical: designTokens.spacing.sm,
    alignItems: "center",
    marginBottom: designTokens.spacing.sm,
  },
  buttonToggleText: { ...designTokens.typography.label, color: designTokens.color.ink.primary },
  historyItem: {
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
    paddingTop: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
  },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyTitle: { ...designTokens.typography.body, fontWeight: "700", flex: 1, marginRight: designTokens.spacing.sm },
  historyMeta: { ...designTokens.typography.body, fontSize: 12, color: designTokens.color.ink.muted, marginTop: designTokens.spacing.xs },
  historyNurse: { ...designTokens.typography.body, fontSize: 12, color: designTokens.color.ink.primary, marginTop: designTokens.spacing.xs },
  emptyState: { ...designTokens.typography.body, color: designTokens.color.ink.muted },
  statusBadge: {
    borderRadius: designTokens.radius.pill,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 2,
  },
  statusBadgeActive: { backgroundColor: designTokens.color.surface.success },
  statusBadgeInactive: { backgroundColor: designTokens.color.surface.danger },
  statusBadgeDanger: { backgroundColor: designTokens.color.surface.danger },
  statusBadgePending: { backgroundColor: designTokens.color.surface.warning },
  statusBadgeCompleted: { backgroundColor: designTokens.color.status.infoBg },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadgeTextActive: { color: designTokens.color.status.successText },
  statusBadgeTextInactive: { color: designTokens.color.ink.danger },
  statusBadgeTextDanger: { color: designTokens.color.ink.danger },
  statusBadgeTextPending: { color: designTokens.color.ink.warning },
  statusBadgeTextCompleted: { color: designTokens.color.status.infoText },
  errorBanner: {
    ...designTokens.typography.body,
    backgroundColor: designTokens.color.surface.danger,
    color: designTokens.color.ink.danger,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.md,
  },
  loading: {
    ...designTokens.typography.body,
    textAlign: "center",
    padding: designTokens.spacing.xl,
    color: designTokens.color.ink.muted,
  },
});
