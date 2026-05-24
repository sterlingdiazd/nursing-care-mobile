import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import {
  getAdminUserDetail,
  updateAdminUserActiveState,
  updateAdminUserRoles,
  invalidateAdminUserSessions,
  type AdminUserDetailDto,
  type AdminUserRoleName,
  type AdminUserAccountStatus,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { hapticFeedback } from "@/src/utils/haptics";

function translateRole(role: AdminUserRoleName): string {
  switch (role) {
    case "ADMIN": return "Administrador";
    case "CLIENT": return "Cliente";
    case "NURSE": return "Enfermera";
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

function statusColors(status: AdminUserAccountStatus) {
  switch (status) {
    case "Active":
      return { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText };
    case "Inactive":
      return { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText };
    default:
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return "N/A";
  return formatDateTimeES(value);
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
  const [showOverflow, setShowOverflow] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<AdminUserRoleName[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const fetchedIdRef = useRef<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminUserDetail(id);
      setDetail(response);
      setSelectedRoles(response.roleNames);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle del usuario.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
    if (!id || fetchedIdRef.current === id) return;
    fetchedIdRef.current = id;
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, id]);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated]);

  const handleToggleActiveState = async () => {
    if (!detail) return;
    hapticFeedback.light();
    try {
      setToggling(true);
      const newState = !detail.isActive;
      setDetail({ ...detail, isActive: newState });
      await updateAdminUserActiveState(detail.id, newState);
    } catch (err) {
      setDetail((prev) => (prev ? { ...prev, isActive: !prev.isActive } : prev));
      setError(err instanceof Error ? err.message : "No fue posible cambiar el estado del usuario.");
    } finally {
      setToggling(false);
    }
  };

  const handleInvalidateSessions = async () => {
    if (!detail) return;
    hapticFeedback.light();
    setShowOverflow(false);
    try {
      setInvalidating(true);
      setError(null);
      await invalidateAdminUserSessions(detail.id);
      void load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible invalidar las sesiones del usuario.",
      );
    } finally {
      setInvalidating(false);
    }
  };

  const handleSaveRoles = async () => {
    if (!detail) return;
    hapticFeedback.light();
    try {
      setSavingRoles(true);
      setRolesError(null);
      const updated = await updateAdminUserRoles(detail.id, selectedRoles);
      setDetail(updated);
      setShowRolesModal(false);
    } catch (err) {
      setRolesError(
        err instanceof Error ? err.message : "No fue posible actualizar los roles del usuario.",
      );
    } finally {
      setSavingRoles(false);
    }
  };

  const toggleRole = (role: AdminUserRoleName) => {
    hapticFeedback.selection();
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) return null;

  const status = detail ? statusColors(detail.accountStatus) : null;

  const workflowActions: FooterAction[] = detail
    ? [
        {
          label: detail.isActive ? "Desactivar" : "Activar",
          onPress: () => void handleToggleActiveState(),
          variant: "secondary",
          disabled: toggling,
          testID: "admin-user-toggle-active-button",
        },
        {
          label: "Roles",
          onPress: () => {
            setSelectedRoles(detail.roleNames);
            setRolesError(null);
            setShowRolesModal(true);
          },
          variant: "secondary",
          testID: adminTestIds.users.detailPrimaryAction,
        },
        {
          label: "Editar",
          onPress: () => router.push(`/admin/users/${id}/edit` as never),
          variant: "primary",
          testID: "admin-user-edit-button",
        },
      ]
    : [];

  return (
    <MobileWorkspaceShell
      title={detail ? detail.displayName : "Cargando..."}
      testID={adminTestIds.users.detailScreen}
      nativeID={adminTestIds.users.detailScreen}
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminUsers)}
      primaryReturnLabel="Volver"
      headerAccessory={
        detail ? (
          <Pressable
            onPress={() => {
              hapticFeedback.selection();
              setShowOverflow(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Más acciones"
            testID="admin-user-overflow-trigger"
            nativeID="admin-user-overflow-trigger"
            hitSlop={8}
            style={({ pressed }) => [styles.overflowTrigger, pressed && styles.pressed]}
          >
            <Text style={styles.overflowGlyph}>⋯</Text>
          </Pressable>
        ) : undefined
      }
      workflowActions={workflowActions}
    >
      {error ? (
        <View style={styles.errorBanner}>
          <Text
            style={styles.errorText}
            testID={adminTestIds.users.detailErrorBanner}
            nativeID={adminTestIds.users.detailErrorBanner}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => {
              hapticFeedback.light();
              void load();
            }}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Reintentar"
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && !detail ? <Text style={styles.loading}>Cargando...</Text> : null}

      {detail ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Status pill — single source of "is this account healthy?" */}
          {status ? (
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <Text
                style={[styles.statusPillText, { color: status.fg }]}
                testID={adminTestIds.users.detailStatusChip}
                nativeID={adminTestIds.users.detailStatusChip}
              >
                {translateAccountStatus(detail.accountStatus)}
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Personal</Text>
            {detail.name ? <Field label="Nombre" value={detail.name} /> : null}
            {detail.lastName ? <Field label="Apellido" value={detail.lastName} /> : null}
            {detail.identificationNumber ? (
              <Field label="Cédula" value={detail.identificationNumber} />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información de Contacto</Text>
            <Field label="Correo" value={detail.email} />
            {detail.phone ? <Field label="Teléfono" value={detail.phone} /> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta</Text>
            <Field
              label="Roles"
              value={
                detail.roleNames.length > 0
                  ? detail.roleNames.map(translateRole).join(", ")
                  : "Sin roles"
              }
            />
            <Field label="Sesiones Activas" value={String(detail.activeRefreshTokenCount)} />
            <Field label="Fecha de Registro" value={formatTimestamp(detail.createdAtUtc)} />
          </View>

          {detail.nurseProfile ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perfil de Enfermera</Text>
              {detail.nurseProfile.specialty ? (
                <Field label="Especialidad" value={detail.nurseProfile.specialty} />
              ) : null}
              {detail.nurseProfile.licenseId ? (
                <Field label="Licencia" value={detail.nurseProfile.licenseId} />
              ) : null}
              {detail.nurseProfile.category ? (
                <Field label="Categoría" value={detail.nurseProfile.category} />
              ) : null}
              <Field
                label="Solicitudes Asignadas"
                value={String(detail.nurseProfile.assignedCareRequestsCount)}
              />
              {detail.nurseProfile.hireDate ? (
                <Field
                  label="Fecha de Contratación"
                  value={formatTimestamp(detail.nurseProfile.hireDate)}
                />
              ) : null}
            </View>
          ) : null}

          {detail.clientProfile ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perfil de Cliente</Text>
              <Field
                label="Solicitudes Propias"
                value={String(detail.clientProfile.ownedCareRequestsCount)}
              />
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {/* Overflow sheet — destructive / rarely-used actions live here */}
      <Modal
        visible={showOverflow}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOverflow(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            hapticFeedback.selection();
            setShowOverflow(false);
          }}
        >
          <Pressable style={styles.overflowSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.overflowTitle}>Acciones</Text>
            <Pressable
              style={({ pressed }) => [styles.overflowItem, pressed && styles.pressed]}
              onPress={handleInvalidateSessions}
              disabled={invalidating}
              accessibilityRole="button"
              accessibilityLabel="Cerrar todas las sesiones del usuario"
              testID="admin-user-invalidate-sessions-button"
              nativeID="admin-user-invalidate-sessions-button"
            >
              <Text style={[styles.overflowItemText, styles.overflowItemDanger]}>
                {invalidating ? "Cerrando…" : "Cerrar Sesiones"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Manage roles modal */}
      {showRolesModal && detail ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Gestionar Roles</Text>
            <Text style={styles.modalSubtitle}>{detail.displayName}</Text>

            {rolesError ? <Text style={styles.modalError}>{rolesError}</Text> : null}

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
                    {isSelected ? <Text style={styles.checkboxCheck}>✓</Text> : null}
                  </View>
                  <Text style={[styles.roleLabel, !isAllowed && styles.roleLabelDisabled]}>
                    {translateRole(role)}
                  </Text>
                </Pressable>
              );
            })}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  hapticFeedback.selection();
                  setShowRolesModal(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  savingRoles && styles.disabled,
                ]}
                onPress={handleSaveRoles}
                disabled={savingRoles}
                accessibilityRole="button"
                accessibilityLabel="Guardar roles"
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  {savingRoles ? "Guardando…" : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </MobileWorkspaceShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 12,
    paddingBottom: 24,
  },
  overflowTrigger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  overflowGlyph: {
    color: designTokens.color.ink.primary,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  card: {
    ...mobileSurfaceCard,
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: designTokens.color.ink.primary,
    marginBottom: 4,
  },
  field: {
    paddingVertical: 4,
  },
  fieldLabel: {
    color: designTokens.color.ink.secondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  fieldValue: {
    color: designTokens.color.ink.primary,
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: designTokens.color.surface.danger,
    borderColor: designTokens.color.border.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    color: designTokens.color.status.dangerText,
    fontSize: 13,
    fontWeight: "700",
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryButtonText: {
    color: designTokens.color.ink.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  loading: {
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    alignItems: "stretch",
  },
  overflowSheet: {
    backgroundColor: designTokens.color.surface.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 4,
  },
  overflowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: designTokens.color.ink.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  overflowItem: {
    paddingVertical: 14,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  overflowItemText: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  overflowItemDanger: {
    color: designTokens.color.status.dangerText,
  },
  modal: {
    margin: 16,
    padding: 20,
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 18,
    alignSelf: "center",
    width: "92%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: designTokens.color.ink.primary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: designTokens.color.ink.secondary,
    marginTop: 2,
    marginBottom: 14,
  },
  modalError: {
    color: designTokens.color.status.dangerText,
    fontSize: 13,
    marginBottom: 10,
    backgroundColor: designTokens.color.surface.danger,
    padding: 8,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonSecondary: {
    backgroundColor: designTokens.color.surface.secondary,
  },
  modalButtonPrimary: {
    backgroundColor: mobileTheme.colors.ink.accent,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  modalButtonTextPrimary: {
    color: designTokens.color.ink.inverse,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.surface.secondary,
  },
  roleRowDisabled: {
    opacity: 0.4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: mobileTheme.colors.border.accent,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: mobileTheme.colors.ink.accent,
  },
  checkboxCheck: {
    color: designTokens.color.ink.inverse,
    fontSize: 13,
    fontWeight: "800",
  },
  roleLabel: {
    color: designTokens.color.ink.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  roleLabelDisabled: {
    color: designTokens.color.ink.muted,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
