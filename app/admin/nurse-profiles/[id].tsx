import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  getNurseProfileForAdmin,
  setNurseOperationalAccessForAdmin,
  type NurseProfileAdminRecordDto,
} from "@/src/services/adminPortalService";
import { mobileAdminActionButton, mobileAdminActionButtonText } from "@/src/design-system/mobileStyles";
import { adminTestIds } from "@/src/testing/testIds";

function formatTimestamp(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminNurseProfileDetailScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<NurseProfileAdminRecordDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const response = await getNurseProfileForAdmin(id);
      setDetail(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el perfil de la enfermera.");
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

  const handleToggleOperationalAccess = async () => {
    if (!detail) return;
    try {
      setToggling(true);
      const newStatus = !detail.nurseProfileIsActive;
      await setNurseOperationalAccessForAdmin(detail.userId, newStatus);
      setDetail({ ...detail, nurseProfileIsActive: newStatus });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cambiar el acceso operacional");
    } finally {
      setToggling(false);
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Perfil de Enfermera"
      title={detail ? `${detail.name} ${detail.lastName}` : "Cargando..."}
      description="Información completa del perfil de enfermera."
      testID={adminTestIds.nurses.detailScreen}
      nativeID={adminTestIds.nurses.detailScreen}
      actions={(
        <View style={styles.headerActions}>
          <Pressable
            style={styles.button}
            onPress={() => void load()}
            accessibilityRole="button"
            accessibilityLabel="Actualizar perfil de enfermera"
          >
            <Text style={styles.buttonText}>Actualizar</Text>
          </Pressable>
          {detail && (
            <Pressable
              testID={adminTestIds.nurses.detailPrimaryAction}
              nativeID={adminTestIds.nurses.detailPrimaryAction}
              style={styles.buttonPrimary}
              onPress={() => router.push(`/admin/nurse-profiles/${id}/edit` as any)}
              accessibilityRole="button"
              accessibilityLabel="Editar perfil de enfermera"
            >
              <Text style={styles.buttonPrimaryText}>Editar</Text>
            </Pressable>
          )}
        </View>
      )}
    >
      {!!error && (
        <Text
          testID={adminTestIds.nurses.detailErrorBanner}
          nativeID={adminTestIds.nurses.detailErrorBanner}
          style={styles.error}
        >
          {error}
        </Text>
      )}
      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {detail && (
        <ScrollView>
          {/* Status Indicators */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              {detail.isProfileComplete && (
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeTextSuccess}>✓ Perfil completo</Text>
                </View>
              )}
              {detail.isPendingReview && (
                <View style={styles.badgeWarning}>
                  <Text style={styles.badgeTextWarning}>⚠️ Pendiente de revisión</Text>
                </View>
              )}
              {detail.isAssignmentReady && (
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeTextSuccess}>✓ Lista para asignación</Text>
                </View>
              )}
            </View>
            <Text
              testID={adminTestIds.nurses.detailStatusChip}
              nativeID={adminTestIds.nurses.detailStatusChip}
              style={styles.statusChip}
            >
              Acceso operacional: {detail.nurseProfileIsActive ? "Activo" : "Inactivo"}
            </Text>
          </View>

          {/* Personal Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Personal</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre completo</Text>
              <Text style={styles.fieldValue}>{detail.name} {detail.lastName}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo electrónico</Text>
              <Text style={styles.fieldValue}>{detail.email}</Text>
            </View>
            {detail.identificationNumber && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Cédula</Text>
                <Text style={styles.fieldValue}>{detail.identificationNumber}</Text>
              </View>
            )}
            {detail.phone && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Teléfono</Text>
                <Text style={styles.fieldValue}>{detail.phone}</Text>
              </View>
            )}
          </View>

          {/* Professional Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Profesional</Text>
            {detail.hireDate && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Fecha de contratación</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(detail.hireDate)}</Text>
              </View>
            )}
            {detail.specialty && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Especialidad</Text>
                <Text style={styles.fieldValue}>{detail.specialty}</Text>
              </View>
            )}
            {detail.licenseId && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Licencia</Text>
                <Text style={styles.fieldValue}>{detail.licenseId}</Text>
              </View>
            )}
            {detail.category && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Categoría</Text>
                <Text style={styles.fieldValue}>{detail.category}</Text>
              </View>
            )}
          </View>

          {/* Banking Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Bancaria</Text>
            {detail.bankName ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Banco</Text>
                  <Text style={styles.fieldValue}>{detail.bankName}</Text>
                </View>
                {detail.accountNumber && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Número de cuenta</Text>
                    <Text style={styles.fieldValue}>{detail.accountNumber}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>No se ha proporcionado información bancaria.</Text>
            )}
          </View>

          {/* Workload Summary */}
          {detail.workload && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Carga de Trabajo</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Total de solicitudes asignadas</Text>
                <Text style={styles.fieldValue}>{detail.workload.totalAssignedCareRequests || 0}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Pendientes</Text>
                <Text style={styles.fieldValue}>{detail.workload.pendingAssignedCareRequests || 0}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Aprobadas</Text>
                <Text style={styles.fieldValue}>{detail.workload.approvedAssignedCareRequests || 0}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Rechazadas</Text>
                <Text style={styles.fieldValue}>{detail.workload.rejectedAssignedCareRequests || 0}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Completadas</Text>
                <Text style={styles.fieldValue}>{detail.workload.completedAssignedCareRequests || 0}</Text>
              </View>
              {detail.workload.lastCareRequestAtUtc && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Última solicitud</Text>
                  <Text style={styles.fieldValue}>{formatTimestamp(detail.workload.lastCareRequestAtUtc)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Status and Actions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado y Acciones</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Usuario activo</Text>
              <Text style={styles.fieldValue}>{detail.userIsActive ? "Sí" : "No"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Acceso operacional</Text>
              <Text style={styles.fieldValue}>{detail.nurseProfileIsActive ? "Activo" : "Inactivo"}</Text>
            </View>
            
            <Pressable
              testID={adminTestIds.nurses.detailOperationalToggleButton}
              nativeID={adminTestIds.nurses.detailOperationalToggleButton}
              style={[styles.toggleButton, toggling && styles.toggleButtonDisabled]}
              onPress={handleToggleOperationalAccess}
              disabled={toggling}
            >
              <Text style={styles.toggleButtonText}>
                {toggling ? "Cambiando..." : detail.nurseProfileIsActive ? "Desactivar acceso operacional" : "Activar acceso operacional"}
              </Text>
            </Pressable>

            {detail.isPendingReview && (
              <Pressable
                testID={adminTestIds.nurses.detailReviewButton}
                nativeID={adminTestIds.nurses.detailReviewButton}
                style={styles.reviewButton}
                onPress={() => router.push(`/admin/nurse-profiles/${id}/review` as any)}
              >
                <Text style={styles.reviewButtonText}>Revisar y Completar Perfil</Text>
              </Pressable>
            )}
          </View>

          {/* Metadata */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información del Sistema</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ID de usuario</Text>
              <Text style={styles.fieldValueMono}>{detail.userId}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha de creación</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(detail.createdAtUtc)}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 8 },
  button: { backgroundColor: designTokens.color.surface.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: designTokens.color.ink.primary, fontWeight: "700", fontSize: 14 },
  buttonPrimary: { ...mobileAdminActionButton, paddingHorizontal: 16, paddingVertical: 10 },
  buttonPrimaryText: { ...mobileAdminActionButtonText },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: designTokens.color.ink.secondary, fontSize: 14, textAlign: "center", padding: 20 },
  statusCard: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { marginTop: 10, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: "800", backgroundColor: designTokens.color.surface.secondary, borderWidth: 1, borderColor: designTokens.color.border.subtle, color: designTokens.color.ink.primary },
  badgeSuccess: { backgroundColor: designTokens.color.surface.success, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  badgeTextSuccess: { color: designTokens.color.status.successText, fontSize: 12, fontWeight: "700" },
  badgeWarning: { backgroundColor: designTokens.color.surface.warning, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  badgeTextWarning: { color: designTokens.color.status.warningText, fontSize: 12, fontWeight: "700" },
  card: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  field: { marginBottom: 8 },
  fieldLabel: { color: designTokens.color.status.dangerText, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  fieldValue: { color: designTokens.color.ink.primary, fontSize: 15 },
  fieldValueMono: { color: designTokens.color.ink.primary, fontSize: 13, fontFamily: "monospace" },
  emptyText: { color: designTokens.color.ink.secondary, fontSize: 14, fontStyle: "italic" },
  toggleButton: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 12 },
  toggleButtonDisabled: { opacity: 0.5 },
  toggleButtonText: { ...mobileAdminActionButtonText },
  reviewButton: { ...mobileAdminActionButton, paddingVertical: 12, marginTop: 8 },
  reviewButtonText: { ...mobileAdminActionButtonText },
});
