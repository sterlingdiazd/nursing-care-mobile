import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
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
import { mobileAdminActionButton, mobileAdminActionButtonText, mobileTheme } from "@/src/design-system/mobileStyles";
import { adminTestIds } from "@/src/testing/testIds";

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
    case "Active": return { bg: designTokens.color.surface.success, text: designTokens.color.status.successText };
    case "Inactive": return { bg: designTokens.color.surface.danger, text: designTokens.color.status.dangerText };
    default: return { bg: designTokens.color.surface.warning, text: designTokens.color.status.warningText };
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
      description="Muestra primero el estado y la siguiente acción segura antes del resto del perfil."
      testID={adminTestIds.users.detailScreen}
      nativeID={adminTestIds.users.detailScreen}
      actions={(
        <View style={styles.headerActions}>
          <Pressable
            style={styles.button}
            onPress={() => void load()}
            accessibilityRole="button"
            accessibilityLabel="Actualizar datos del usuario"
          >
            <Text style={styles.buttonText}>Actualizar</Text>
          </Pressable>
        </View>
      )}
    >
      {!!error && (
        <View style={styles.errorCard}>
          <Text
            style={styles.errorText}
            testID={adminTestIds.users.detailErrorBanner}
            nativeID={adminTestIds.users.detailErrorBanner}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => void load()}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Reintentar carga de datos"
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      )}
      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {detail && (
        <ScrollView>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Resumen operativo</Text>
            <Text
              style={styles.summaryChip}
              testID={adminTestIds.users.detailStatusChip}
              nativeID={adminTestIds.users.detailStatusChip}
            >
              {translateAccountStatus(detail.accountStatus)}
            </Text>
            <Text style={styles.summaryText}>
              {detail.isActive
                ? "La cuenta está activa. Revisa roles o sesiones solo si hay riesgo operativo."
                : "La cuenta está inactiva. Confirma la razón antes de reactivarla o ajustar permisos."}
            </Text>
          </View>

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
              accessibilityRole="button"
              accessibilityLabel="Editar usuario"
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
              testID={adminTestIds.users.detailPrimaryAction}
              nativeID={adminTestIds.users.detailPrimaryAction}
              accessibilityRole="button"
              accessibilityLabel="Gestionar roles del usuario"
            >
              <Text style={styles.buttonPrimaryText}>Gestionar roles</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, toggling && styles.buttonDisabled]}
              onPress={handleToggleActiveState}
              disabled={toggling}
              accessibilityRole="button"
              accessibilityLabel={detail.isActive ? "Desactivar cuenta del usuario" : "Activar cuenta del usuario"}
            >
              <Text style={styles.toggleButtonText}>
                {toggling ? "Cambiando..." : detail.isActive ? "Desactivar usuario" : "Activar usuario"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.buttonDanger, invalidating && styles.buttonDisabled]}
              onPress={handleInvalidateSessions}
              disabled={invalidating}
              accessibilityRole="button"
              accessibilityLabel="Invalidar todas las sesiones activas del usuario"
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
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Rol ${translateRole(role)}`}
                  accessibilityState={{ checked: isSelected, disabled: !isAllowed }}
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
                accessibilityRole="button"
                accessibilityLabel="Cancelar gestión de roles"
              >
                <Text style={styles.buttonSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.buttonPrimary, savingRoles && styles.buttonDisabled]}
                onPress={handleSaveRoles}
                disabled={savingRoles}
                accessibilityRole="button"
                accessibilityLabel={savingRoles ? "Guardando roles" : "Guardar roles seleccionados"}
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
  button: { backgroundColor: designTokens.color.surface.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: designTokens.color.ink.primary, fontWeight: "700", fontSize: 14 },
  buttonPrimary: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 8 },
  buttonPrimaryText: { ...mobileAdminActionButtonText },
  buttonSecondary: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 4 },
  buttonSecondaryText: { ...mobileAdminActionButtonText },
  buttonDanger: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 8 },
  buttonDangerText: { ...mobileAdminActionButtonText },
  buttonDisabled: { opacity: 0.5 },
  toggleButton: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 8 },
  toggleButtonText: { ...mobileAdminActionButtonText },
  errorCard: { backgroundColor: designTokens.color.surface.danger, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: designTokens.color.ink.danger, fontSize: 14, marginBottom: 8 },
  summaryCard: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 16, marginBottom: 12 },
  summaryEyebrow: { color: designTokens.color.status.dangerText, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 6 },
  summaryChip: { alignSelf: "flex-start", backgroundColor: designTokens.color.ink.primary, color: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  summaryText: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18 },
  retryButton: { backgroundColor: designTokens.color.ink.danger, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: "flex-start" },
  retryButtonText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 13 },
  loading: { color: designTokens.color.ink.secondary, fontSize: 14, textAlign: "center", padding: 20 },
  card: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  field: { marginBottom: 8 },
  fieldLabel: { color: designTokens.color.status.dangerText, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  fieldValue: { color: designTokens.color.ink.primary, fontSize: 15 },
  fieldValueMono: { color: designTokens.color.ink.primary, fontSize: 13, fontFamily: "monospace" },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  statusBadgeActive: { backgroundColor: designTokens.color.surface.success },
  statusBadgeInactive: { backgroundColor: designTokens.color.surface.danger },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadgeTextActive: { color: designTokens.color.status.successText },
  statusBadgeTextInactive: { color: designTokens.color.status.dangerText },
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 18, padding: 20, width: "100%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: designTokens.color.ink.secondary, marginBottom: 16 },
  modalError: { color: designTokens.color.ink.danger, fontSize: 13, marginBottom: 12, backgroundColor: designTokens.color.surface.danger, padding: 8, borderRadius: 8 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  roleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: designTokens.color.surface.secondary },
  roleRowDisabled: { opacity: 0.4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: mobileTheme.colors.border.accent, marginRight: 12, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: mobileTheme.colors.ink.accent },
  checkboxCheck: { color: designTokens.color.ink.inverse, fontSize: 13, fontWeight: "800" },
  roleLabel: { color: designTokens.color.ink.primary, fontSize: 15, fontWeight: "600" },
  roleLabelDisabled: { color: "#94a3b8" },
});
