import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AdminCompensationRuleListItem } from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";

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
      accessibilityRole="button"
      accessibilityLabel={`Regla ${rule.name}`}
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
    backgroundColor: designTokens.color.surface.secondary,
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
    color: designTokens.color.ink.secondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusActive: {
    backgroundColor: designTokens.color.surface.success,
  },
  statusInactive: {
    backgroundColor: designTokens.color.surface.tertiary,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  statusTextActive: {
    color: designTokens.color.status.successText,
  },
  statusTextInactive: {
    color: designTokens.color.ink.muted,
  },
  employmentType: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
  },
  percents: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
    paddingTop: 8,
  },
  percentItem: {
    alignItems: "center",
  },
  percentLabel: {
    fontSize: 10,
    color: designTokens.color.ink.muted,
    marginBottom: 2,
  },
  percentValue: {
    fontSize: 14,
    fontWeight: "600",
    color: designTokens.color.ink.accentStrong,
  },
});
