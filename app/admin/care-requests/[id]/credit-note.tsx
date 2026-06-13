import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import WorkflowActionBar, { type WorkflowAction } from "@/src/components/shared/WorkflowActionBar";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequestDetail,
  issueCreditNote,
  type AdminCareRequestDetailDto,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  formatAdminCareRequestStatusLabel,
  getStatusPillColors,
} from "@/src/utils/adminCareRequestBilling";
import { IconBadge } from "@/src/components/shared/IconBadge";
import { mobileSecondarySurface, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

/**
 * T1.4 — record a credit note / refund against a Paid care request. The request stays Paid; this is
 * an audited ledger entry. The backend caps cumulative credits at the amount paid.
 */
export default function AdminCareRequestCreditNoteScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminCareRequestDetailDto | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    if (!id) {
      setError("No fue posible identificar la solicitud.");
      return;
    }
    try {
      setError(null);
      setLoading(true);
      setDetail(await getAdminCareRequestDetail(id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar la solicitud.");
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
  }, [id, isAuthenticated, isReady, requiresProfileCompletion, roles]);

  const parsedAmount = useMemo(() => parseFloat(amount.replace(",", ".")), [amount]);
  const canSubmit = detail?.status === "Paid" && Number.isFinite(parsedAmount) && parsedAmount > 0 && reason.trim().length > 0;

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  const handleBackToDetail = () => {
    if (!id) return;
    const route = `/admin/care-requests/${id}?billingRefresh=${Date.now()}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(route);
      return;
    }
    router.replace(route as any);
  };

  const handleSubmit = async () => {
    if (!id || !canSubmit) return;
    try {
      setError(null);
      setSubmitting(true);
      const result = await issueCreditNote(id, {
        amount: parsedAmount,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
      });
      setSuccess(
        `Nota de crédito registrada por ${formatCurrency(result.amount)}. ` +
          `Total acreditado: ${formatCurrency(result.totalCredited)}.`,
      );
      setAmount("");
      setReason("");
      setReference("");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible registrar la nota de crédito.");
    } finally {
      setSubmitting(false);
    }
  };

  const actions: WorkflowAction[] = [
    {
      label: "Volver al detalle",
      onPress: handleBackToDetail,
      variant: "secondary",
      testID: adminTestIds.careRequests.billingRoutes.backButton,
    },
  ];
  if (!success) {
    actions.push({
      label: submitting ? "Registrando..." : "Registrar nota de crédito",
      onPress: () => void handleSubmit(),
      variant: "primary",
      disabled: loading || submitting || !canSubmit,
      testID: "credit-note-submit",
    });
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Cobro administrativo"
      title="Nota de crédito / Reembolso"
      description="Registra un reembolso o crédito contra un pago ya confirmado. La solicitud sigue Pagada; es un registro contable auditado y no puede exceder el monto pagado."
      actions={<WorkflowActionBar actions={actions} />}
    >
      <View testID="credit-note-screen" nativeID="credit-note-screen" style={styles.pageRoot}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!success && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Nota de crédito registrada</Text>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}
        {loading && <Text style={styles.loading}>Cargando solicitud...</Text>}

        {detail && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              <View style={styles.cardHeader}>
                <IconBadge icon="info-circle" hue="blue" size={30} iconSize={15} />
                <Text style={styles.cardHeaderTitle}>Resumen</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Cliente</Text>
                <Text style={styles.value}>{detail.clientDisplayName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Estado</Text>
                <View style={[styles.statusPill, { backgroundColor: getStatusPillColors(detail.status).bg }]}>
                  <Text style={[styles.statusPillText, { color: getStatusPillColors(detail.status).fg }]}>
                    {formatAdminCareRequestStatusLabel(detail.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Total pagado</Text>
                <Text style={styles.value}>{formatCurrency(detail.total)}</Text>
              </View>
            </View>

            <View style={styles.taskCard}>
              {detail.status !== "Paid" ? (
                <View style={styles.noticeCard}>
                  <Text style={styles.noticeTitle}>Acción no disponible</Text>
                  <Text style={styles.noticeText}>Solo puedes registrar una nota de crédito sobre una solicitud Pagada.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Monto (RD$)</Text>
                  <TextInput
                    testID="credit-note-amount"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={designTokens.color.ink.muted}
                    keyboardType="decimal-pad"
                    editable={!submitting}
                    style={styles.input}
                  />
                  <Text style={styles.inputLabel}>Motivo</Text>
                  <TextInput
                    testID="credit-note-reason"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Motivo del reembolso o crédito"
                    placeholderTextColor={designTokens.color.ink.muted}
                    multiline
                    numberOfLines={3}
                    editable={!submitting}
                    style={[styles.input, styles.textArea]}
                  />
                  <Text style={styles.inputLabel}>Referencia (opcional)</Text>
                  <TextInput
                    testID="credit-note-reference"
                    value={reference}
                    onChangeText={setReference}
                    placeholder="Ref. de la transferencia / nota de crédito"
                    placeholderTextColor={designTokens.color.ink.muted}
                    editable={!submitting}
                    style={styles.input}
                  />
                </>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  pageRoot: { flex: 1 },
  error: {
    backgroundColor: designTokens.color.surface.danger,
    color: designTokens.color.status.dangerText,
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
    marginBottom: designTokens.spacing.lg,
  },
  successCard: {
    backgroundColor: designTokens.color.surface.success,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.success,
    marginBottom: designTokens.spacing.lg,
  },
  successTitle: {
    color: designTokens.color.status.successText,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    marginBottom: designTokens.spacing.xs,
  },
  successText: { color: designTokens.color.ink.primary, lineHeight: 22 },
  loading: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.body.fontSize,
    textAlign: "center",
    paddingVertical: designTokens.spacing.xxl,
  },
  summaryCard: { ...mobileSurfaceCard, padding: designTokens.spacing.xl, marginBottom: designTokens.spacing.lg },
  taskCard: { ...mobileSurfaceCard, padding: designTokens.spacing.xl, marginBottom: designTokens.spacing.xl },
  cardTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
    marginBottom: mobileTheme.spacing.lg,
  },
  cardHeaderTitle: {
    ...mobileTheme.typography.sectionTitle,
    color: mobileTheme.colors.ink.primary,
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: "800" },
  row: { marginBottom: designTokens.spacing.md },
  label: { ...designTokens.typography.eyebrow, color: designTokens.color.ink.muted, marginBottom: designTokens.spacing.xs },
  value: { ...designTokens.typography.body, color: designTokens.color.ink.primary },
  inputLabel: {
    ...designTokens.typography.eyebrow,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.sm,
    marginTop: designTokens.spacing.md,
  },
  input: {
    ...mobileSecondarySurface,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  noticeCard: {
    backgroundColor: designTokens.color.surface.warning,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.warning,
  },
  noticeTitle: { color: designTokens.color.status.warningText, fontWeight: "800", marginBottom: designTokens.spacing.xs },
  noticeText: { color: designTokens.color.status.warningText, lineHeight: 22 },
});
