import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminUserDetail,
  updateAdminUserActiveState,
  updateAdminUserRoles,
  invalidateAdminUserSessions,
  type AdminUserDetailDto,
  type AdminUserRoleName,
  type AdminUserAccountStatus,
  type AdminUserProfileType,
} from "@/src/services/adminPortalService";

function translateRole(role: AdminUserRoleName): string {
  switch (role) {
    case "ADMIN": return "Administrador";
    case "CLIENT": return "Cliente";
    case "NURSE": return "Enfermera";
  }
}

function translateProfileType(profileType: AdminUserProfileType): string {
  switch (profileType) {
    case "ADMIN": return "Administrador";
    case "CLIENT": return "Cliente";
    case "NURSE": return "Enfermera";
    default: return "Sin perfil";
  }
}

function translateAccountStatus(status: AdminUserAccountStatus): string {
  switch (status) {
    case "Active": return "Activo";
    case "Inactive": return "Inactivo";
    case "ProfileIncomplete": return "Perfil incompleto";
    case "AdminReview": return "Revisión admin";
    case "ManualIntervention": return "Intervención manual";
  }
}

function statusBadgeStyle(status: AdminUserAccountStatus) {
  switch (status) {
    case "Active": return { bg: "#d1fae5", text: "#065f46" };
    case "Inactive": return { bg: "#fee2e2", text: "#991b1b" };
    default: return { bg: "#fef3c7", text: "#92400e" };
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const ALL_ROLES: AdminUserRoleName[] = ["ADMIN", "CLIENT", "NURSE"];

export default function AdminUserDetailScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminUserDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [invalidating, setInvalidating] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<AdminUserRoleName[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminUserDetail(id);
      setDetail(response);
      setSelectedRoles(response.roleNames);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle del usuario.");
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
      await updateAdminUserActiveState(detail.id, newState);
    } catch (err) {
      // Revert on failure
      setDetail((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
      setError(err instanceof Error ? err.message : "No fue posible cambiar el estado del usuario.");
    } finally {
      setToggling(false);
    }
  };

  const handleInvalidateSessions = async () => {
    if (!detail) return;
    try {
      setInvalidating(true);
      setError(null);
      await invalidateAdminUserSessions(detail.id);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible invalidar las sesiones del usuario.");
    } finally {
      setInvalidating(false);
    }
  };

  const handleSaveRoles = async () => {
    if (!detail) return;
    try {
      setSavingRoles(true);
      setRolesError(null);
      const updated = await updateAdminUserRoles(detail.id, selectedRoles);
      setDetail(updated);
      setShowRolesModal(false);
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : "No fue posible actualizar los roles del usuario.");
    } finally {
      setSavingRoles(false);
    }
  };

  const toggleRole = (role: AdminUserRoleName) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  const badgeColors = detail ? statusBadgeStyle(detail.accountStatus) : null;

  return (
    <MobileWorkspaceShell
      eyebrow="Usuarios"
      title={detail ? detail.displayName : "Cargando..."}
      description="Información completa de la cuenta de usuario."
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

          {/* Roles & Profile */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Roles y Perfil</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Roles</Text>
              <Text style={styles.fieldValue}>
                {detail.roleNames.length > 0 ? detail.roleNames.map(translateRole).join(", ") : "Sin roles"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tipo de perfil</Text>
              <Text style={styles.fieldValue}>{translateProfileType(detail.profileType)}</Text>
            </View>
          </View>

          {/* Account Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado de la Cuenta</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Estado de cuenta</Text>
              {badgeColors && (
                <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: badgeColors.text }]}>
                    {translateAccountStatus(detail.accountStatus)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Activo</Text>
              <View style={[styles.statusBadge, detail.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, detail.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                  {detail.isActive ? "Sí" : "No"}
                </Text>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sesiones activas</Text>
              <Text style={styles.fieldValue}>{detail.activeRefreshTokenCount}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha de registro</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(detail.createdAtUtc)}</Text>
            </View>
          </View>

          {/* Nurse Profile */}
          {detail.nurseProfile && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perfil de Enfermera</Text>
              {detail.nurseProfile.specialty && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Especialidad</Text>
                  <Text style={styles.fieldValue}>{detail.nurseProfile.specialty}</Text>
                </View>
              )}
              {detail.nurseProfile.licenseId && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Licencia</Text>
                  <Text style={styles.fieldValue}>{detail.nurseProfile.licenseId}</Text>
                </View>
              )}
              {detail.nurseProfile.category && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Categoría</Text>
                  <Text style={styles.fieldValue}>{detail.nurseProfile.category}</Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Solicitudes asignadas</Text>
                <Text style={styles.fieldValue}>{detail.nurseProfile.assignedCareRequestsCount}</Text>
              </View>
              {detail.nurseProfile.hireDate && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Fecha de contratación</Text>
                  <Text style={styles.fieldValue}>{formatTimestamp(detail.nurseProfile.hireDate)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Client Profile */}
          {detail.clientProfile && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perfil de Cliente</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Solicitudes propias</Text>
                <Text style={styles.fieldValue}>{detail.clientProfile.ownedCareRequestsCount}</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Acciones</Text>
            <Pressable
              style={styles.buttonSecondary}
              onPress={() => router.push(`/admin/users/${id}/edit` as never)}
            >
              <Text style={styles.buttonSecondaryText}>Editar usuario</Text>
            </Pressable>
            <Pressable
              style={styles.buttonPrimary}
              onPress={() => {
                setSelectedRoles(detail.roleNames);
                setRolesError(null);
                setShowRolesModal(true);
              }}
            >
              <Text style={styles.buttonPrimaryText}>Gestionar roles</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, toggling && styles.buttonDisabled]}
              onPress={handleToggleActiveState}
              disabled={toggling}
            >
              <Text style={styles.toggleButtonText}>
                {toggling ? "Cambiando..." : detail.isActive ? "Desactivar usuario" : "Activar usuario"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.buttonDanger, invalidating && styles.buttonDisabled]}
              onPress={handleInvalidateSessions}
              disabled={invalidating}
            >
              <Text style={styles.buttonDangerText}>
                {invalidating ? "Invalidando..." : "Invalidar sesiones"}
              </Text>
            </Pressable>
          </View>

          {/* System Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información del Sistema</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ID de usuario</Text>
              <Text style={styles.fieldValueMono}>{detail.id}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Manage Roles Modal */}
      {showRolesModal && detail && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Gestionar roles</Text>
            <Text style={styles.modalSubtitle}>Selecciona los roles para {detail.displayName}</Text>

            {!!rolesError && <Text style={styles.modalError}>{rolesError}</Text>}

            {ALL_ROLES.map((role) => {
              const isSelected = selectedRoles.includes(role);
              const isAllowed = detail.allowedRoleNames.includes(role);
              return (
                <Pressable
                  key={role}
                  style={[styles.roleRow, !isAllowed && styles.roleRowDisabled]}
                  onPress={() => isAllowed && toggleRole(role)}
                  disabled={!isAllowed}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.roleLabel, !isAllowed && styles.roleLabelDisabled]}>
                    {translateRole(role)}
                  </Text>
                </Pressable>
              );
            })}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.buttonSecondary}
                onPress={() => setShowRolesModal(false)}
              >
                <Text style={styles.buttonSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.buttonPrimary, savingRoles && styles.buttonDisabled]}
                onPress={handleSaveRoles}
                disabled={savingRoles}
              >
                <Text style={styles.buttonPrimaryText}>
                  {savingRoles ? "Guardando..." : "Guardar roles"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 8 },
  button: { backgroundColor: "#f0f4f8", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 12, marginTop: 8 },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonSecondary: { backgroundColor: "#f0f4f8", borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  buttonSecondaryText: { color: "#102a43", fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonDanger: { backgroundColor: "#ef4444", borderRadius: 12, paddingVertical: 12, marginTop: 8 },
  buttonDangerText: { color: "#ffffff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  toggleButton: { backgroundColor: "#f59e0b", borderRadius: 12, paddingVertical: 12, marginTop: 8 },
  toggleButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 14, textAlign: "center" },
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
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  statusBadgeActive: { backgroundColor: "#d1fae5" },
  statusBadgeInactive: { backgroundColor: "#fee2e2" },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadgeTextActive: { color: "#065f46" },
  statusBadgeTextInactive: { color: "#991b1b" },
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { backgroundColor: "#ffffff", borderRadius: 18, padding: 20, width: "100%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#102a43", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: "#52637a", marginBottom: 16 },
  modalError: { color: "#c00", fontSize: 13, marginBottom: 12, backgroundColor: "#fee", padding: 8, borderRadius: 8 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  roleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f4f8" },
  roleRowDisabled: { opacity: 0.4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#3b82f6", marginRight: 12, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: "#3b82f6" },
  checkboxCheck: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  roleLabel: { color: "#102a43", fontSize: 15, fontWeight: "600" },
  roleLabelDisabled: { color: "#94a3b8" },
});
