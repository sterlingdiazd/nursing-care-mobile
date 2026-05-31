import { useEffect, useMemo, useState, type ReactNode } from "react";
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
} from "@/src/design-system/mobileStyles";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { designTokens } from "@/src/design-system/tokens";

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
  /** Optional content rendered above the input (e.g., the payment-proof image to verify). */
  renderBeforeInput?: (detail: AdminCareRequestDetailDto) => ReactNode;
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
  return formatDateTimeES(value);
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
  renderBeforeInput,
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
    const refreshParams = new URLSearchParams({
      billingAction: action,
      billingRefresh: Date.now().toString(),
    });
    const detailRoute = `/admin/care-requests/${id}?${refreshParams.toString()}`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(detailRoute);
      return;
    }

    router.replace(detailRoute as any);
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
                <Text
                  testID="care-request-status-badge"
                  nativeID="care-request-status-badge"
                  style={[styles.statusValue, { color: getAdminCareRequestStatusColor(detail.status) }]}
                >
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

              {renderBeforeInput ? renderBeforeInput(detail) : null}

              {inputTestID && inputLabel && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{inputLabel}</Text>
                  <TextInput
                    testID={inputTestID}
                    nativeID={inputTestID}
                    value={value}
                    onChangeText={setValue}
                    placeholder={inputPlaceholder}
                    placeholderTextColor={designTokens.color.ink.muted}
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
  successText: {
    color: designTokens.color.ink.primary,
    lineHeight: 22,
  },
  successHint: {
    color: designTokens.color.ink.secondary,
    lineHeight: 21,
    marginTop: designTokens.spacing.sm,
  },
  loading: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.body.fontSize,
    textAlign: "center",
    paddingVertical: designTokens.spacing.xxl,
  },
  summaryCard: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.xl,
    marginBottom: designTokens.spacing.lg,
  },
  taskCard: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.xl,
    marginBottom: designTokens.spacing.xl,
  },
  cardTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.lg,
  },
  detailRow: {
    marginBottom: designTokens.spacing.md,
  },
  detailLabel: {
    ...designTokens.typography.eyebrow,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.xs,
  },
  detailValue: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.primary,
  },
  statusValue: {
    ...designTokens.typography.body,
    fontWeight: "800",
  },
  taskDescription: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.xl,
  },
  inputGroup: {
    marginBottom: designTokens.spacing.xl,
  },
  inputLabel: {
    ...designTokens.typography.eyebrow,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.sm,
  },
  input: {
    ...mobileSecondarySurface,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  noticeCard: {
    backgroundColor: designTokens.color.surface.warning,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.warning,
  },
  noticeTitle: {
    color: designTokens.color.status.warningText,
    fontWeight: "800",
    marginBottom: designTokens.spacing.xs,
  },
  noticeText: {
    color: designTokens.color.status.warningText,
    lineHeight: 22,
  },
  snapshotCard: {
    marginTop: designTokens.spacing.lg,
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    gap: designTokens.spacing.sm,
  },
  snapshotTitle: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
  },
  snapshotText: {
    color: designTokens.color.ink.secondary,
    lineHeight: 21,
  },
});
