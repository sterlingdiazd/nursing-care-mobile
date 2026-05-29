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
  getAdminCareRequestStatusColor,
} from "@/src/utils/adminCareRequestBilling";
import { mobileSecondarySurface, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";

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
              <Text style={styles.cardTitle}>Resumen</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Cliente</Text>
                <Text style={styles.value}>{detail.clientDisplayName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Estado</Text>
                <Text style={[styles.value, { color: getAdminCareRequestStatusColor(detail.status), fontWeight: "800" }]}>
                  {formatAdminCareRequestStatusLabel(detail.status)}
                </Text>
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
                    placeholderTextColor={mobileTheme.colors.ink.muted}
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
                    placeholderTextColor={mobileTheme.colors.ink.muted}
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
                    placeholderTextColor={mobileTheme.colors.ink.muted}
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
    backgroundColor: mobileTheme.colors.surface.danger,
    color: mobileTheme.colors.status.dangerText,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.danger,
    marginBottom: mobileTheme.spacing.lg,
  },
  successCard: {
    backgroundColor: mobileTheme.colors.surface.success,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.success,
    marginBottom: mobileTheme.spacing.lg,
  },
  successTitle: {
    color: mobileTheme.colors.status.successText,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: mobileTheme.spacing.xs,
  },
  successText: { color: mobileTheme.colors.ink.primary, lineHeight: 22 },
  loading: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: mobileTheme.spacing.xxl,
  },
  summaryCard: { ...mobileSurfaceCard, padding: mobileTheme.spacing.xl, marginBottom: mobileTheme.spacing.lg },
  taskCard: { ...mobileSurfaceCard, padding: mobileTheme.spacing.xl, marginBottom: mobileTheme.spacing.xl },
  cardTitle: {
    ...mobileTheme.typography.sectionTitle,
    color: mobileTheme.colors.ink.primary,
    marginBottom: mobileTheme.spacing.lg,
  },
  row: { marginBottom: mobileTheme.spacing.md },
  label: { ...mobileTheme.typography.eyebrow, color: mobileTheme.colors.ink.muted, marginBottom: mobileTheme.spacing.xs },
  value: { ...mobileTheme.typography.body, color: mobileTheme.colors.ink.primary },
  inputLabel: {
    ...mobileTheme.typography.eyebrow,
    color: mobileTheme.colors.ink.muted,
    marginBottom: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.md,
  },
  input: {
    ...mobileSecondarySurface,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: 14,
    color: mobileTheme.colors.ink.primary,
    fontSize: 15,
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  noticeCard: {
    backgroundColor: mobileTheme.colors.surface.warning,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.warning,
  },
  noticeTitle: { color: mobileTheme.colors.status.warningText, fontWeight: "800", marginBottom: mobileTheme.spacing.xs },
  noticeText: { color: mobileTheme.colors.status.warningText, lineHeight: 22 },
});
