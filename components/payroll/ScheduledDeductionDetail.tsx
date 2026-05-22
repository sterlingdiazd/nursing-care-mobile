import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import type { ScheduledDeductionDetail as ScheduledDeductionDetailType, ScheduledDeductionInstallmentRow } from "@/src/services/payrollTypes";
import {
  payoffScheduledDeduction,
  rescheduleScheduledDeduction,
  skipScheduledInstallment,
  cancelScheduledDeduction,
} from "@/src/services/payrollService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import { useToast } from "@/src/components/shared/ToastProvider";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { DateField } from "@/src/components/form";

function formatPeriodRange(start?: string | null, end?: string | null, fallback?: string): string {
  if (start && end) return `${formatDateES(start)} – ${formatDateES(end)}`;
  return fallback ?? "";
}

interface ScheduledDeductionDetailProps {
  detail: ScheduledDeductionDetailType;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function conceptLabel(type: string): string {
  switch (type) {
    case "Loan": return "Préstamo";
    case "Advance": return "Adelanto";
    case "Insurance": return "Seguro Médico";
    case "Other": return "Otro";
    default: return type;
  }
}

function modalityLabel(m: string): string {
  switch (m) {
    case "Amortizing": return "Amortizable";
    case "RecurringFixed": return "Recurrente fija";
    case "OneTime": return "Única";
    default: return m;
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case "Active": return "Activa";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    default: return s;
  }
}

function cadenceLabel(c: string): string {
  switch (c) {
    case "Monthly": return "Mensual";
    case "PerPeriod": return "Quincenal";
    default: return c;
  }
}

function parseDecimal(t: string): string {
  return t.replace(/[^0-9.]/g, "");
}

function parseInteger(t: string): string {
  return t.replace(/[^0-9]/g, "");
}

interface RescheduleModalProps {
  visible: boolean;
  isAmortizing: boolean;
  onClose: () => void;
  onSubmit: (installmentAmount?: number, recurringAmount?: number, endDate?: string, maxOccurrences?: number) => Promise<void>;
}

function RescheduleModal({ visible, isAmortizing, onClose, onSubmit }: RescheduleModalProps) {
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setInstallmentAmount("");
    setRecurringAmount("");
    setEndDate("");
    setMaxOccurrences("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const ia = installmentAmount ? parseFloat(installmentAmount) : undefined;
      const ra = recurringAmount ? parseFloat(recurringAmount) : undefined;
      const ed = endDate.trim() || undefined;
      const mo = maxOccurrences ? parseInt(maxOccurrences, 10) : undefined;
      await onSubmit(ia, ra, ed, mo);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reprogramar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={rescheduleStyles.backdrop} onPress={handleClose} />
      <View
        style={rescheduleStyles.sheet}
        testID={adminTestIds.payroll.rescheduleModal.container}
        nativeID={adminTestIds.payroll.rescheduleModal.container}
      >
        <View style={rescheduleStyles.header}>
          <Text style={rescheduleStyles.title}>Reprogramar</Text>
          <TouchableOpacity
            onPress={handleClose}
            testID={adminTestIds.payroll.rescheduleModal.cancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancelar reprogramación"
          >
            <Text style={rescheduleStyles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={rescheduleStyles.content} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={rescheduleStyles.errorCard}>
              <Text style={rescheduleStyles.errorText}>{error}</Text>
            </View>
          )}
          {isAmortizing ? (
            <View style={rescheduleStyles.inputGroup}>
              <Text style={rescheduleStyles.label}>Nueva cuota</Text>
              <View style={rescheduleStyles.amountField}>
                <Text style={rescheduleStyles.amountAffix}>RD$</Text>
                <TextInput
                  style={rescheduleStyles.amountInput}
                  value={installmentAmount}
                  onChangeText={(t) => setInstallmentAmount(parseDecimal(t))}
                  placeholder="0"
                  placeholderTextColor={designTokens.color.ink.muted}
                  keyboardType="decimal-pad"
                  testID={adminTestIds.payroll.rescheduleModal.installmentAmountInput}
                  nativeID={adminTestIds.payroll.rescheduleModal.installmentAmountInput}
                  accessibilityLabel="Nueva cuota"
                />
              </View>
            </View>
          ) : (
            <>
              <View style={rescheduleStyles.inputGroup}>
                <Text style={rescheduleStyles.label}>Nuevo monto recurrente</Text>
                <View style={rescheduleStyles.amountField}>
                  <Text style={rescheduleStyles.amountAffix}>RD$</Text>
                  <TextInput
                    style={rescheduleStyles.amountInput}
                    value={recurringAmount}
                    onChangeText={(t) => setRecurringAmount(parseDecimal(t))}
                    placeholder="0"
                    placeholderTextColor={designTokens.color.ink.muted}
                    keyboardType="decimal-pad"
                    testID={adminTestIds.payroll.rescheduleModal.recurringAmountInput}
                    nativeID={adminTestIds.payroll.rescheduleModal.recurringAmountInput}
                    accessibilityLabel="Nuevo monto recurrente"
                  />
                </View>
              </View>
              <DateField
                label="Fecha de fin (opcional)"
                clearable
                value={endDate}
                onChange={setEndDate}
                testID={adminTestIds.payroll.rescheduleModal.endDateInput}
                accessibilityLabel="Fecha de fin"
              />
              <View style={rescheduleStyles.inputGroup}>
                <Text style={rescheduleStyles.label}># máximo de ocurrencias (opcional)</Text>
                <TextInput
                  style={rescheduleStyles.input}
                  value={maxOccurrences}
                  onChangeText={(t) => setMaxOccurrences(parseInteger(t))}
                  placeholder="0"
                  placeholderTextColor={designTokens.color.ink.muted}
                  keyboardType="number-pad"
                  testID={adminTestIds.payroll.rescheduleModal.maxOccurrencesInput}
                  nativeID={adminTestIds.payroll.rescheduleModal.maxOccurrencesInput}
                  accessibilityLabel="Máximo de ocurrencias"
                />
              </View>
            </>
          )}
          <TouchableOpacity
            style={rescheduleStyles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            testID={adminTestIds.payroll.rescheduleModal.submitButton}
            accessibilityRole="button"
            accessibilityLabel={loading ? "Guardando" : "Guardar cambios"}
            accessibilityState={{ busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color={designTokens.color.ink.inverse} />
            ) : (
              <Text style={rescheduleStyles.submitBtnText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function ScheduledDeductionDetail({ detail, onBack, onRefresh }: ScheduledDeductionDetailProps) {
  const { showToast } = useToast();
  const { plan, installments } = detail;
  const isActive = plan.status === "Active";
  const isAmortizing = plan.modality === "Amortizing";

  const [showReschedule, setShowReschedule] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const pendingInstallments = installments.filter((i) => !i.paid && i.payrollPeriodId != null);

  const handlePayoff = () => {
    Alert.alert(
      "Liquidación anticipada",
      "¿Confirmas la liquidación anticipada de esta deducción? El saldo restante quedará cancelado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Liquidar",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await payoffScheduledDeduction(plan.id);
              showToast({ message: "Liquidación anticipada registrada correctamente", variant: "success" });
              await onRefresh();
            } catch (e) {
              showToast({
                message: e instanceof Error ? e.message : "Error al procesar la liquidación",
                variant: "error",
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReschedule = async (
    installmentAmount?: number,
    recurringAmount?: number,
    endDate?: string,
    maxOccurrences?: number
  ) => {
    await rescheduleScheduledDeduction(plan.id, {
      installmentAmount,
      recurringAmount,
      endDate,
      maxOccurrences,
    });
    showToast({ message: "Descuento fijo reprogramado correctamente", variant: "success" });
    await onRefresh();
  };

  const handleSkip = () => {
    if (pendingInstallments.length === 0) {
      Alert.alert("Sin cuotas pendientes", "No hay cuotas pendientes con período asignado para omitir.");
      return;
    }
    // Use the first pending installment with a period assigned.
    const next = pendingInstallments[0];
    const periodLabel = formatPeriodRange(next.periodStart, next.periodEnd, next.label);
    Alert.alert(
      "Omitir cuota",
      `¿Omitir la cuota del período "${periodLabel}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Omitir",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await skipScheduledInstallment(plan.id, next.payrollPeriodId!);
              showToast({ message: "Cuota omitida correctamente", variant: "success" });
              await onRefresh();
            } catch (e) {
              showToast({
                message: e instanceof Error ? e.message : "Error al omitir la cuota",
                variant: "error",
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.prompt(
      "Anular deducción",
      "Ingresa el motivo de la anulación:",
      async (reason) => {
        if (!reason || !reason.trim()) return;
        setActionLoading(true);
        try {
          await cancelScheduledDeduction(plan.id, reason.trim());
          showToast({ message: "Deducción anulada correctamente", variant: "success" });
          await onRefresh();
        } catch (e) {
          showToast({
            message: e instanceof Error ? e.message : "Error al anular la deducción",
            variant: "error",
          });
        } finally {
          setActionLoading(false);
        }
      },
      "plain-text"
    );
  };

  const statusTone =
    plan.status === "Active"
      ? "success" as const
      : plan.status === "Completed"
        ? "neutral" as const
        : "danger" as const;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      testID={adminTestIds.payroll.scheduledDetailPanel}
      nativeID={adminTestIds.payroll.scheduledDetailPanel}
    >
      {/* Invisible loaded marker */}
      <Text
        testID={adminTestIds.payroll.scheduledDetailLoaded}
        nativeID={adminTestIds.payroll.scheduledDetailLoaded}
        style={styles.loadedMarker}
      >
        {" "}
      </Text>

      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.planLabel}>{plan.label}</Text>
            <Text style={styles.planMeta}>
              {conceptLabel(plan.deductionType)} · {modalityLabel(plan.modality)} · {cadenceLabel(plan.cadence)}
            </Text>
            <Text style={styles.nurseName}>{plan.nurseDisplayName}</Text>
          </View>
          <StatusBadge label={statusLabel(plan.status)} tone={statusTone} />
        </View>

        {isAmortizing ? (
          <View style={styles.metricsGrid}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Saldo</Text>
              <Text style={styles.metricValue}>{formatCurrency(plan.remainingBalance)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Total a pagar</Text>
              <Text style={styles.metricValue}>{formatCurrency(plan.totalRepayable)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Capital</Text>
              <Text style={styles.metricValue}>{formatCurrency(plan.principalAmount)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Tasa</Text>
              <Text style={styles.metricValue}>{plan.interestRatePercent}%</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Cuota</Text>
              <Text style={styles.metricValue}>{formatCurrency(plan.installmentAmount)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Cuotas</Text>
              <Text style={styles.metricValue}>{plan.installmentsPaid}/{plan.totalInstallments}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Monto</Text>
              <Text style={styles.metricValue}>{formatCurrency(plan.recurringAmount)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Ocurrencias</Text>
              <Text style={styles.metricValue}>
                {plan.installmentsGenerated}
                {plan.maxOccurrences != null ? `/${plan.maxOccurrences}` : ""}
              </Text>
            </View>
            {plan.endDate && (
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Fin</Text>
                <Text style={styles.metricValue}>{formatDateES(plan.endDate)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Actions — gated by status === "Active" */}
      {isActive && (
        <View style={styles.actionsRow}>
          {isAmortizing && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger, actionLoading && styles.actionBtnDisabled]}
              onPress={handlePayoff}
              disabled={actionLoading}
              testID={adminTestIds.payroll.scheduledPayoffButton}
              accessibilityRole="button"
              accessibilityLabel="Liquidación anticipada"
            >
              <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Liquidación anticipada</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, actionLoading && styles.actionBtnDisabled]}
            onPress={() => setShowReschedule(true)}
            disabled={actionLoading}
            testID={adminTestIds.payroll.scheduledRescheduleButton}
            accessibilityRole="button"
            accessibilityLabel="Reprogramar"
          >
            <Text style={styles.actionBtnText}>Reprogramar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, actionLoading && styles.actionBtnDisabled]}
            onPress={handleSkip}
            disabled={actionLoading || pendingInstallments.length === 0}
            testID={adminTestIds.payroll.scheduledSkipButton}
            accessibilityRole="button"
            accessibilityLabel="Omitir cuota"
          >
            <Text style={styles.actionBtnText}>Omitir cuota</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger, actionLoading && styles.actionBtnDisabled]}
            onPress={handleCancel}
            disabled={actionLoading}
            testID={adminTestIds.payroll.scheduledCancelButton}
            accessibilityRole="button"
            accessibilityLabel="Anular"
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Anular</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Installments list */}
      <Text style={styles.sectionTitle}>Cuotas</Text>
      <View
        style={styles.installmentsList}
        testID={adminTestIds.payroll.scheduledInstallmentsList}
        nativeID={adminTestIds.payroll.scheduledInstallmentsList}
      >
        {installments.length === 0 ? (
          <Text style={styles.emptyText}>No hay cuotas generadas aún.</Text>
        ) : (
          installments.map((inst, idx) => (
            <InstallmentRow key={idx} inst={inst} />
          ))
        )}
      </View>

      <RescheduleModal
        visible={showReschedule}
        isAmortizing={isAmortizing}
        onClose={() => setShowReschedule(false)}
        onSubmit={handleReschedule}
      />
    </ScrollView>
  );
}

function InstallmentRow({ inst }: { inst: ScheduledDeductionInstallmentRow }) {
  const periodText = formatPeriodRange(inst.periodStart, inst.periodEnd, inst.label);

  return (
    <View style={styles.installmentRow}>
      <View style={styles.installmentLeft}>
        {inst.sequence != null && (
          <Text style={styles.installmentSeq}>#{inst.sequence}</Text>
        )}
        <View>
          <Text style={styles.installmentPeriod}>{periodText}</Text>
        </View>
      </View>
      <View style={styles.installmentRight}>
        <Text style={styles.installmentAmount}>{formatCurrency(inst.amount)}</Text>
        <View style={[styles.installmentBadge, inst.paid ? styles.badgePaid : styles.badgePending]}>
          <Text style={[styles.installmentBadgeText, inst.paid ? styles.badgeTextPaid : styles.badgeTextPending]}>
            {inst.paid ? "Pagada" : "Pendiente"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadedMarker: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 1,
    width: 1,
    opacity: 0,
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  planLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  planMeta: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
    marginTop: 2,
  },
  nurseName: {
    fontSize: 13,
    color: designTokens.color.ink.secondary,
    marginTop: 4,
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricBlock: {
    minWidth: "30%",
    flex: 1,
    backgroundColor: designTokens.color.surface.tertiary,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: designTokens.color.surface.accent,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
  },
  actionBtnDanger: {
    backgroundColor: designTokens.color.surface.danger,
    borderColor: designTokens.color.border.danger,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: designTokens.color.ink.accentStrong,
  },
  actionBtnTextDanger: {
    color: designTokens.color.status.dangerText,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  installmentsList: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.secondary,
  },
  installmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  installmentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  installmentSeq: {
    fontSize: 12,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
    minWidth: 24,
  },
  installmentPeriod: {
    fontSize: 13,
    color: designTokens.color.ink.secondary,
  },
  installmentRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  installmentAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  installmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePaid: {
    backgroundColor: designTokens.color.surface.success,
  },
  badgePending: {
    backgroundColor: designTokens.color.surface.warning,
  },
  installmentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  badgeTextPaid: {
    color: designTokens.color.status.successText,
  },
  badgeTextPending: {
    color: designTokens.color.status.warningText,
  },
  emptyText: {
    fontSize: 14,
    color: designTokens.color.ink.muted,
    padding: 16,
    textAlign: "center",
  },
});

const rescheduleStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 48, 68, 0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "65%",
    backgroundColor: designTokens.color.surface.primary,
    borderTopLeftRadius: designTokens.radius.xl,
    borderTopRightRadius: designTokens.radius.xl,
    paddingBottom: designTokens.spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  cancelBtn: {
    fontSize: 16,
    color: designTokens.color.ink.muted,
  },
  content: {
    padding: designTokens.spacing.lg,
  },
  errorCard: {
    backgroundColor: designTokens.color.surface.danger,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.lg,
  },
  errorText: {
    color: designTokens.color.status.dangerText,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: designTokens.spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: designTokens.color.ink.primary,
    backgroundColor: designTokens.color.surface.secondary,
  },
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    backgroundColor: designTokens.color.surface.secondary,
  },
  amountAffix: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: designTokens.spacing.sm,
    fontSize: 18,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
  },
  submitBtn: {
    backgroundColor: designTokens.color.ink.accentStrong,
    borderRadius: designTokens.radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: designTokens.spacing.sm,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.inverse,
  },
});
