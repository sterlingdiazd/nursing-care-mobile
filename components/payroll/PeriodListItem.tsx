import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AdminPayrollPeriodListItem } from "@/src/services/payrollService";

interface PeriodListItemProps {
  period: AdminPayrollPeriodListItem;
  onPress: (period: AdminPayrollPeriodListItem) => void;
}

export function PeriodListItem({ period, onPress }: PeriodListItemProps) {
  const isOpen = period.status === "Open";

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(period)}
    >
      <View style={styles.header}>
        <Text style={styles.dates}>
          {period.startDate} - {period.endDate}
        </Text>
        <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
          <Text style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
            {isOpen ? "Abierto" : "Cerrado"}
          </Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Corte</Text>
          <Text style={styles.detailValue}>{period.cutoffDate}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Pago</Text>
          <Text style={styles.detailValue}>{period.paymentDate}</Text>
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
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dates: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusOpen: {
    backgroundColor: "#e3f2fd",
  },
  statusClosed: {
    backgroundColor: "#f5f5f5",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusTextOpen: {
    color: "#1976d2",
  },
  statusTextClosed: {
    color: "#666",
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