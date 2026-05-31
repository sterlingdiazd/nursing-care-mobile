import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AdminPayrollPeriodListItem } from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { quincenaLabel } from "@/src/utils/payrollPeriods";
import { hapticFeedback } from "@/src/utils/haptics";

interface PeriodListItemProps {
  period: AdminPayrollPeriodListItem;
  onPress: (id: string) => void;
  /** True for the open period whose date range contains today — gets an accent rail + "Actual" chip. */
  isCurrent?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

export function PeriodListItem({ period, onPress, isCurrent = false }: PeriodListItemProps) {
  const isOpen = period.status === "Open";
  const label = quincenaLabel(period.startDate, period.endDate);
  const handlePress = () => {
    hapticFeedback.selection();
    onPress(period.id);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isCurrent && styles.containerCurrent]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${isCurrent ? ", quincena actual" : ""}, total ${formatCurrency(period.totalNet)}, estado: ${isOpen ? "Abierto" : "Cerrado"}`}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{label}</Text>
          {isCurrent && (
            <View style={styles.currentChip}>
              <Text style={styles.currentChipText}>Actual</Text>
            </View>
          )}
        </View>
        <StatusBadge
          label={isOpen ? "Abierto" : "Cerrado"}
          tone={isOpen ? "success" : "neutral"}
          testID="payroll-period-status-badge"
        />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Total neto</Text>
        <Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(period.totalNet)}
        </Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Pago</Text>
          <Text style={styles.detailValue}>{formatDateES(period.paymentDate)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Cierre</Text>
          <Text style={styles.detailValue}>{formatDateES(period.cutoffDate)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Líneas</Text>
          <Text style={styles.detailValue}>{period.lineCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.primary,
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.05)",
  },
  containerCurrent: {
    borderLeftWidth: 4,
    borderLeftColor: designTokens.color.ink.accent,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  titleGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm,
  },
  title: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  currentChip: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radius.pill,
    backgroundColor: designTokens.color.surface.accent,
  },
  currentChipText: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.accent,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  amountLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.muted,
  },
  amountValue: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.xs,
  },
  detailValue: {
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.secondary,
  },
});
