import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AdminPayrollPeriodListItem } from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { hapticFeedback } from "@/src/utils/haptics";

interface PeriodListItemProps {
  period: AdminPayrollPeriodListItem;
  onPress: (id: string) => void;
}

export function PeriodListItem({ period, onPress }: PeriodListItemProps) {
  const isOpen = period.status === "Open";
  const handlePress = () => {
    hapticFeedback.selection();
    onPress(period.id);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Período ${formatDateES(period.startDate)} - ${formatDateES(period.endDate)}, estado: ${isOpen ? "Abierto" : "Cerrado"}`}
    >
      <View style={styles.header}>
        <Text style={styles.dates}>
          {formatDateES(period.startDate)} - {formatDateES(period.endDate)}
        </Text>
        <StatusBadge
          label={isOpen ? "Abierto" : "Cerrado"}
          tone={isOpen ? "success" : "neutral"}
          testID="payroll-period-status-badge"
        />
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.05)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dates: {
    fontSize: 16,
    fontWeight: "700",
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
    fontSize: 11,
    color: designTokens.color.ink.muted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: designTokens.color.ink.secondary,
  },
});
