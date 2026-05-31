import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ScheduledDeductionListItem as ScheduledDeductionListItemType } from "@/src/services/payrollTypes";
import { designTokens } from "@/src/design-system/tokens";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { StatusBadge, type BadgeTone } from "@/src/components/shared/StatusBadge";
import { hapticFeedback } from "@/src/utils/haptics";

interface ScheduledDeductionListItemProps {
  item: ScheduledDeductionListItemType;
  onPress: (id: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function conceptLabel(deductionType: string): string {
  switch (deductionType) {
    case "Loan": return "Préstamo";
    case "Advance": return "Adelanto";
    case "Insurance": return "Seguro Médico";
    case "Other": return "Otro";
    default: return deductionType;
  }
}

function modalityLabel(modality: string): string {
  switch (modality) {
    case "Amortizing": return "Amortizable";
    case "RecurringFixed": return "Recurrente fija";
    case "OneTime": return "Única";
    default: return modality;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "Active": return "Activa";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    default: return status;
  }
}

export function ScheduledDeductionListItem({ item, onPress }: ScheduledDeductionListItemProps) {
  const isAmortizing = item.modality === "Amortizing";
  // Standardized installment progress, shown on the second line for every item.
  // Amortizing always has a fixed total; recurring shows progress only when capped.
  const progressLabel = isAmortizing
    ? `Cuota ${item.installmentsPaid} de ${item.totalInstallments}`
    : item.maxOccurrences != null
      ? `Cuota ${item.installmentsGenerated} de ${item.maxOccurrences}`
      : null;
  const statusTone: BadgeTone =
    item.status === "Active" ? "success" : item.status === "Completed" ? "neutral" : "danger";
  const handlePress = () => {
    hapticFeedback.selection();
    onPress(item.id);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID={adminTestIds.payroll.scheduledListItem(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Descuento fijo ${item.label} de ${item.nurseDisplayName}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          <Text style={styles.conceptRow}>
            {conceptLabel(item.deductionType)} · {modalityLabel(item.modality)}
          </Text>
        </View>
        <StatusBadge label={statusLabel(item.status)} tone={statusTone} />
      </View>

      <View style={styles.secondLine}>
        <Text style={styles.nurse} numberOfLines={1}>{item.nurseDisplayName}</Text>
        {progressLabel && <Text style={styles.progress}>{progressLabel}</Text>}
      </View>

      {isAmortizing ? (
        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Saldo</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.remainingBalance)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Cuota</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.installmentAmount)}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Monto</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.recurringAmount)}</Text>
          </View>
          {item.maxOccurrences == null && item.endDate ? (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Fin</Text>
                <Text style={styles.metricValue}>{formatDateES(item.endDate)}</Text>
              </View>
            </>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.05)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: designTokens.spacing.xs,
  },
  titleWrap: {
    flex: 1,
    marginRight: designTokens.spacing.sm,
  },
  label: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  conceptRow: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.muted,
    marginTop: 1,
  },
  secondLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: designTokens.spacing.sm,
  },
  nurse: {
    flex: 1,
    marginRight: designTokens.spacing.sm,
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.muted,
  },
  progress: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: designTokens.color.surface.tertiary,
    borderRadius: designTokens.radius.sm,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
  },
  metricCell: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: designTokens.color.border.subtle,
  },
  metricLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: designTokens.spacing.xs,
  },
  metricValue: {
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
});
