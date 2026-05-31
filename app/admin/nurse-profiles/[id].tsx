import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import {
  getNurseProfileForAdmin,
  setNurseOperationalAccessForAdmin,
  type NurseProfileAdminRecordDto,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { hapticFeedback } from "@/src/utils/haptics";

type StatusTone = "success" | "warning" | "danger" | "neutral";

function statusToneStyle(tone: StatusTone) {
  switch (tone) {
    case "success":
      return { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText };
    case "warning":
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
    case "danger":
      return { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText };
    default:
      return { bg: designTokens.color.surface.secondary, fg: designTokens.color.ink.primary };
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return "N/A";
  return formatDateES(value);
}

export default function AdminNurseProfileDetailScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<NurseProfileAdminRecordDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const fetchedIdRef = useRef<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const response = await getNurseProfileForAdmin(id);
      setDetail(response);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No fue posible cargar el perfil de la enfermera.",
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

  const handleToggleOperationalAccess = async () => {
    if (!detail) return;
    hapticFeedback.light();
    try {
      setToggling(true);
      const newStatus = !detail.nurseProfileIsActive;
      await setNurseOperationalAccessForAdmin(detail.userId, newStatus);
      setDetail({ ...detail, nurseProfileIsActive: newStatus });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cambiar el acceso operacional.");
    } finally {
      setToggling(false);
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) return null;

  const accessActive = detail?.nurseProfileIsActive ?? false;

  const workflowActions: FooterAction[] = detail
    ? [
        {
          label: accessActive ? "Desactivar" : "Activar",
          onPress: () => void handleToggleOperationalAccess(),
          variant: "secondary",
          disabled: toggling,
          testID: adminTestIds.nurses.detailOperationalToggleButton,
        },
        ...(detail.isPendingReview
          ? [
              {
                label: "Revisar",
                onPress: () => router.push(`/admin/nurse-profiles/${id}/review` as never),
                variant: "primary" as const,
                testID: adminTestIds.nurses.detailReviewButton,
              },
            ]
          : [
              {
                label: "Editar",
                onPress: () => router.push(`/admin/nurse-profiles/${id}/edit` as never),
                variant: "primary" as const,
                testID: adminTestIds.nurses.detailPrimaryAction,
              },
            ]),
      ]
    : [];

  return (
    <MobileWorkspaceShell
      title={detail ? [detail.name, detail.lastName].filter(Boolean).join(" ") || detail.email : "Cargando..."}
      testID={adminTestIds.nurses.detailScreen}
      nativeID={adminTestIds.nurses.detailScreen}
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminNurseProfiles)}
      primaryReturnLabel="Volver"
      workflowActions={workflowActions}
    >
      {error ? (
        <View style={styles.errorBanner}>
          <Text
            testID={adminTestIds.nurses.detailErrorBanner}
            nativeID={adminTestIds.nurses.detailErrorBanner}
            style={styles.errorText}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {loading && !detail ? <Text style={styles.loading}>Cargando...</Text> : null}

      {detail ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Status row — pills come from the canonical status palette */}
          <View style={styles.statusRow}>
            {detail.isProfileComplete ? (
              <StatusPill tone="success" label="Perfil completo" />
            ) : null}
            {detail.isPendingReview ? <StatusPill tone="warning" label="Pendiente revisión" /> : null}
            {detail.isAssignmentReady ? (
              <StatusPill tone="success" label="Lista para asignación" />
            ) : null}
            <StatusPill
              tone={accessActive ? "success" : "danger"}
              label={accessActive ? "Acceso activo" : "Acceso inactivo"}
              testID={adminTestIds.nurses.detailStatusChip}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Personal</Text>
            {detail.name ? <Field label="Nombre" value={detail.name} /> : null}
            {detail.lastName ? <Field label="Apellido" value={detail.lastName} /> : null}
            <Field label="Correo" value={detail.email} />
            {detail.identificationNumber ? (
              <Field label="Cédula" value={detail.identificationNumber} />
            ) : null}
            {detail.phone ? <Field label="Teléfono" value={detail.phone} /> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Profesional</Text>
            {detail.hireDate ? (
              <Field label="Fecha de Contratación" value={formatTimestamp(detail.hireDate)} />
            ) : null}
            {detail.specialty ? <Field label="Especialidad" value={detail.specialty} /> : null}
            {detail.licenseId ? <Field label="Licencia" value={detail.licenseId} /> : null}
            {detail.category ? <Field label="Categoría" value={detail.category} /> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Bancaria</Text>
            {detail.bankName ? (
              <>
                <Field label="Banco" value={detail.bankName} />
                {detail.accountNumber ? (
                  <Field label="Número de Cuenta" value={detail.accountNumber} />
                ) : null}
              </>
            ) : (
              <Text style={styles.emptyText}>Sin información bancaria.</Text>
            )}
          </View>

          {detail.workload ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Carga de Trabajo</Text>
              <View style={styles.workloadRow}>
                <WorkloadStat label="Total" value={detail.workload.totalAssignedCareRequests ?? 0} />
                <WorkloadStat
                  label="Pendientes"
                  value={detail.workload.pendingAssignedCareRequests ?? 0}
                />
                <WorkloadStat
                  label="Aprobadas"
                  value={detail.workload.approvedAssignedCareRequests ?? 0}
                />
                <WorkloadStat
                  label="Rechazadas"
                  value={detail.workload.rejectedAssignedCareRequests ?? 0}
                />
                <WorkloadStat
                  label="Completadas"
                  value={detail.workload.completedAssignedCareRequests ?? 0}
                />
              </View>
              {detail.workload.lastCareRequestAtUtc ? (
                <Field
                  label="Última Solicitud"
                  value={formatTimestamp(detail.workload.lastCareRequestAtUtc)}
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta</Text>
            <Field label="Fecha de Registro" value={formatTimestamp(detail.createdAtUtc)} />
          </View>
        </ScrollView>
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

function StatusPill({
  tone,
  label,
  testID,
}: {
  tone: StatusTone;
  label: string;
  testID?: string;
}) {
  const colors = statusToneStyle(tone);
  return (
    <View
      style={[styles.statusPill, { backgroundColor: colors.bg }]}
      testID={testID}
      nativeID={testID}
    >
      <Text style={[styles.statusPillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

function WorkloadStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.workloadStat}>
      <Text style={styles.workloadValue}>{value}</Text>
      <Text style={styles.workloadLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.xxl,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designTokens.spacing.sm,
  },
  statusPill: {
    borderRadius: designTokens.radius.pill,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  statusPillText: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  card: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  cardTitle: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "900",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.xs,
  },
  field: {
    paddingVertical: designTokens.spacing.xs,
  },
  fieldLabel: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: designTokens.spacing.xs,
  },
  fieldValue: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
  },
  emptyText: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.body.fontSize,
  },
  workloadRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designTokens.spacing.sm,
    marginVertical: designTokens.spacing.sm,
  },
  workloadStat: {
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    alignItems: "center",
  },
  workloadValue: {
    color: mobileTheme.colors.ink.accent,
    fontSize: designTokens.typography.title.fontSize,
    fontWeight: "900",
  },
  workloadLabel: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: designTokens.spacing.xs,
  },
  errorBanner: {
    backgroundColor: designTokens.color.surface.danger,
    borderColor: designTokens.color.border.danger,
    borderWidth: 1,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  errorText: {
    color: designTokens.color.status.dangerText,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "700",
  },
  loading: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.body.fontSize,
    textAlign: "center",
    paddingVertical: designTokens.spacing.xxl,
  },
});
