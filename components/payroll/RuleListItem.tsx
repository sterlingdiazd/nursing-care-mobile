import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AdminCompensationRuleListItem } from "@/src/services/payrollService";

interface RuleListItemProps {
  rule: AdminCompensationRuleListItem;
  onPress: (rule: AdminCompensationRuleListItem) => void;
}

function employmentTypeLabel(type: string): string {
  switch (type) {
    case "FullTime": return "Tiempo Completo";
    case "PartTime": return "Medio Tiempo";
    case "Contractor": return "Contratista";
    default: return type;
  }
}

export function RuleListItem({ rule, onPress }: RuleListItemProps) {
  const formatPercent = (value: number) => `${value}%`;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(rule)}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{rule.name}</Text>
          <View style={[styles.statusBadge, rule.isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, rule.isActive ? styles.statusTextActive : styles.statusTextInactive]}>
              {rule.isActive ? "Activa" : "Inactiva"}
            </Text>
          </View>
        </View>
        <Text style={styles.employmentType}>{employmentTypeLabel(rule.employmentType)}</Text>
      </View>
      
      <View style={styles.percents}>
        <View style={styles.percentItem}>
          <Text style={styles.percentLabel}>Base</Text>
          <Text style={styles.percentValue}>{formatPercent(rule.baseCompensationPercent)}</Text>
        </View>
        <View style={styles.percentItem}>
          <Text style={styles.percentLabel}>Transporte</Text>
          <Text style={styles.percentValue}>{formatPercent(rule.transportIncentivePercent)}</Text>
        </View>
        <View style={styles.percentItem}>
          <Text style={styles.percentLabel}>Complejidad</Text>
          <Text style={styles.percentValue}>{formatPercent(rule.complexityBonusPercent)}</Text>
        </View>
        <View style={styles.percentItem}>
          <Text style={styles.percentLabel}>Insumos</Text>
          <Text style={styles.percentValue}>{formatPercent(rule.medicalSuppliesPercent)}</Text>
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
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusActive: {
    backgroundColor: "#e8f5e9",
  },
  statusInactive: {
    backgroundColor: "#f5f5f5",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  statusTextActive: {
    color: "#2e7d32",
  },
  statusTextInactive: {
    color: "#666",
  },
  employmentType: {
    fontSize: 12,
    color: "#666",
  },
  percents: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  percentItem: {
    alignItems: "center",
  },
  percentLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  percentValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1976d2",
  },
});