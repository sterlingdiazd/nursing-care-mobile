import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import WorkflowActionBar from "@/src/components/shared/WorkflowActionBar";
import type { WorkflowAction } from "@/src/components/shared/WorkflowActionBar";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequestDetail,
  type AdminCareRequestDetailDto,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  formatAdminCareRequestStatusLabel,
  getAdminCareRequestStatusColor,
  isBillingTaskAllowed,
  type AdminCareRequestBillingAction,
} from "@/src/utils/adminCareRequestBilling";
import {
  mobileSecondarySurface,
  mobileSurfaceCard,
  mobileTheme,
} from "@/src/design-system/mobileStyles";

interface BillingTaskScreenProps {
  action: AdminCareRequestBillingAction;
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  submitLoadingLabel: string;
  successMessage: string;
  validationMessage?: string;
  allowedStatuses: AdminCareRequestDetailDto["status"][];
  screenTestID: string;
  submitTestID: string;
  inputTestID?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputMultiline?: boolean;
  execute: (id: string, inputValue: string) => Promise<void>;
}

function automationProps(testId: string) {
  return {
    testID: testId,
    nativeID: testId,
    ...(Platform.OS === "web"
      ? ({
          id: testId,
          "data-testid": testId,
        } as any)
      : null),
  };
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "No disponible";
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

export default function AdminCareRequestBillingTaskScreen({
  action,
  eyebrow,
  title,
  description,
  submitLabel,
  submitLoadingLabel,
  successMessage,
  validationMessage,
  allowedStatuses,
  screenTestID,
  submitTestID,
  inputTestID,
  inputLabel,
  inputPlaceholder,
  inputMultiline = false,
  execute,
}: BillingTaskScreenProps) {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminCareRequestDetailDto | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<string | null>(null);

  const load = async () => {
    if (!id) {
      setError("No fue posible identificar la solicitud.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await getAdminCareRequestDetail(id);
      setDetail(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar la tarea de facturación.");
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

  const actionAllowed = useMemo(() => {
    if (!detail) {
      return false;
    }

    if (!allowedStatuses.includes(detail.status)) {
      return false;
    }

    return isBillingTaskAllowed(detail.status, action);
  }, [action, allowedStatuses, detail]);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  const handleBackToDetail = () => {
    if (!id) return;
    router.replace(`/admin/care-requests/${id}` as any);
  };

  const handleSubmit = async () => {
    if (!id || !detail) return;

    if (inputTestID && !value.trim()) {
      setError(validationMessage ?? "Debes completar el campo requerido.");
      return;
    }

    try {
      setError(null);
      setSuccessState(null);
      setSubmitting(true);
      await execute(id, value.trim());
      setValue("");
      setSuccessState(successMessage);
      await load();
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error ? nextError.message : "No fue posible completar la tarea de facturación.";
      setError(nextMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const actionBarActions: WorkflowAction[] = [
    {
      label: "Volver al detalle",
      onPress: handleBackToDetail,
      variant: "secondary",
      testID: adminTestIds.careRequests.billingRoutes.backButton,
    },
  ];

  if (!successState) {
    actionBarActions.push({
      label: submitting ? submitLoadingLabel : submitLabel,
      onPress: () => void handleSubmit(),
      variant: action === "void" ? "danger" : "primary",
      disabled: loading || submitting || !actionAllowed,
      testID: submitTestID,
    });
  }

  return (
    <MobileWorkspaceShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={(
        <WorkflowActionBar actions={actionBarActions} />
      )}
    >
      <View {...automationProps(screenTestID)} style={styles.pageRoot}>
        {!!error && (
          <Text {...automationProps(adminTestIds.careRequests.billingRoutes.errorBanner)} style={styles.error}>
            {error}
          </Text>
        )}

        {!!successState && (
          <View {...automationProps(adminTestIds.careRequests.billingRoutes.successBanner)} style={styles.successCard}>
            <Text style={styles.successTitle}>Estado actualizado</Text>
            <Text style={styles.successText}>{successState}</Text>
            <Text style={styles.successHint}>
              Revisa el resumen actualizado y vuelve al detalle cuando quieras continuar.
            </Text>
          </View>
        )}

        {loading && <Text style={styles.loading}>Cargando tarea...</Text>}

        {detail && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Resumen de la solicitud</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Solicitud</Text>
                <Text style={styles.detailValue}>#{detail.id.substring(0, 8)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cliente</Text>
                <Text style={styles.detailValue}>{detail.clientDisplayName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estado</Text>
                <Text style={[styles.statusValue, { color: getAdminCareRequestStatusColor(detail.status) }]}>
                  {formatAdminCareRequestStatusLabel(detail.status)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text style={styles.detailValue}>{formatCurrency(detail.total)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Actualizada</Text>
                <Text style={styles.detailValue}>{formatTimestamp(detail.updatedAtUtc)}</Text>
              </View>
            </View>

            <View style={styles.taskCard}>
              <Text style={styles.cardTitle}>Tarea de facturación</Text>
              <Text style={styles.taskDescription}>{description}</Text>

              {inputTestID && inputLabel && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{inputLabel}</Text>
                  <TextInput
                    testID={inputTestID}
                    nativeID={inputTestID}
                    value={value}
                    onChangeText={setValue}
                    placeholder={inputPlaceholder}
                    placeholderTextColor={mobileTheme.colors.ink.muted}
                    multiline={inputMultiline}
                    numberOfLines={inputMultiline ? 4 : 1}
                    editable={!submitting}
                    style={[
                      styles.input,
                      inputMultiline && styles.textArea,
                    ]}
                  />
                </View>
              )}

              {!actionAllowed && !successState && (
                <View style={styles.noticeCard}>
                  <Text style={styles.noticeTitle}>Acción no disponible</Text>
                  <Text style={styles.noticeText}>
                    Esta tarea solo se permite cuando la solicitud está en {allowedStatuses.map(formatAdminCareRequestStatusLabel).join(" o ")}.
                  </Text>
                </View>
              )}

              {(detail.invoiceNumber || detail.bankReference || detail.voidReason || detail.receiptNumber) && (
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotTitle}>Referencia de facturación</Text>
                  {detail.invoiceNumber && (
                    <Text style={styles.snapshotText}>Factura actual: {detail.invoiceNumber}</Text>
                  )}
                  {detail.bankReference && (
                    <Text style={styles.snapshotText}>Referencia bancaria: {detail.bankReference}</Text>
                  )}
                  {detail.voidReason && (
                    <Text style={styles.snapshotText}>Motivo de anulación: {detail.voidReason}</Text>
                  )}
                  {detail.receiptNumber && (
                    <Text style={styles.snapshotText}>Recibo generado: {detail.receiptNumber}</Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  pageRoot: {
    flex: 1,
  },
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
  successText: {
    color: mobileTheme.colors.ink.primary,
    lineHeight: 22,
  },
  successHint: {
    color: mobileTheme.colors.ink.secondary,
    lineHeight: 21,
    marginTop: mobileTheme.spacing.sm,
  },
  loading: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: mobileTheme.spacing.xxl,
  },
  summaryCard: {
    ...mobileSurfaceCard,
    padding: mobileTheme.spacing.xl,
    marginBottom: mobileTheme.spacing.lg,
  },
  taskCard: {
    ...mobileSurfaceCard,
    padding: mobileTheme.spacing.xl,
    marginBottom: mobileTheme.spacing.xl,
  },
  cardTitle: {
    ...mobileTheme.typography.sectionTitle,
    color: mobileTheme.colors.ink.primary,
    marginBottom: mobileTheme.spacing.lg,
  },
  detailRow: {
    marginBottom: mobileTheme.spacing.md,
  },
  detailLabel: {
    ...mobileTheme.typography.eyebrow,
    color: mobileTheme.colors.ink.muted,
    marginBottom: mobileTheme.spacing.xs,
  },
  detailValue: {
    ...mobileTheme.typography.body,
    color: mobileTheme.colors.ink.primary,
  },
  statusValue: {
    ...mobileTheme.typography.body,
    fontWeight: "800",
  },
  taskDescription: {
    ...mobileTheme.typography.body,
    color: mobileTheme.colors.ink.secondary,
    marginBottom: mobileTheme.spacing.xl,
  },
  inputGroup: {
    marginBottom: mobileTheme.spacing.xl,
  },
  inputLabel: {
    ...mobileTheme.typography.eyebrow,
    color: mobileTheme.colors.ink.muted,
    marginBottom: mobileTheme.spacing.sm,
  },
  input: {
    ...mobileSecondarySurface,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: 14,
    color: mobileTheme.colors.ink.primary,
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  noticeCard: {
    backgroundColor: mobileTheme.colors.surface.warning,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.warning,
  },
  noticeTitle: {
    color: mobileTheme.colors.status.warningText,
    fontWeight: "800",
    marginBottom: mobileTheme.spacing.xs,
  },
  noticeText: {
    color: mobileTheme.colors.status.warningText,
    lineHeight: 22,
  },
  snapshotCard: {
    marginTop: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.surface.secondary,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    gap: mobileTheme.spacing.sm,
  },
  snapshotTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  snapshotText: {
    color: mobileTheme.colors.ink.secondary,
    lineHeight: 21,
  },
});
