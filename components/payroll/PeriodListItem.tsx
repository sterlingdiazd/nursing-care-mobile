import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AdminPayrollPeriodListItem } from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";

interface PeriodListItemProps {
  period: AdminPayrollPeriodListItem;
  onPress: (id: string) => void;
}

export function PeriodListItem({ period, onPress }: PeriodListItemProps) {
  const isOpen = period.status === "Open";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(period.id)}
      accessibilityRole="button"
      accessibilityLabel={`Período ${period.startDate} - ${period.endDate}, estado: ${isOpen ? "Abierto" : "Cerrado"}`}
    >
      <View style={styles.header}>
        <Text style={styles.dates}>
          {period.startDate} - {period.endDate}
        </Text>
        <View
          style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}
          testID="payroll-period-status-badge"
          nativeID="payroll-period-status-badge"
        >
          <Text style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
            {isOpen ? "Abierto" : "Cerrado"}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Pago</Text>
          <Text style={styles.detailValue}>{period.paymentDate}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Cierre</Text>
          <Text style={styles.detailValue}>{period.cutoffDate}</Text>
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: designTokens.color.surface.success,
  },
  statusClosed: {
    backgroundColor: designTokens.color.surface.secondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusTextOpen: {
    color: designTokens.color.status.successText,
  },
  statusTextClosed: {
    color: designTokens.color.ink.muted,
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
