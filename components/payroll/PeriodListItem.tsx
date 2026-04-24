import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AdminPayrollPeriodListItem } from "@/src/services/payrollService";

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
          <Text style={styles.detailLabel}>Personal</Text>
          <Text style={styles.detailValue}>{period.staffCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: "#dcfce7",
  },
  statusClosed: {
    backgroundColor: "#f1f5f9",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusTextOpen: {
    color: "#15803d",
  },
  statusTextClosed: {
    color: "#475569",
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
    color: "#666",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: "#333",
  },
});
