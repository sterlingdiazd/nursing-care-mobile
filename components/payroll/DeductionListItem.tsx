import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import type { AdminDeductionListItem } from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";

interface DeductionListItemProps {
  deduction: AdminDeductionListItem;
  onDelete: (deduction: AdminDeductionListItem) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(amount);
}

function deductionTypeLabel(type: string): string {
  switch (type) {
    case "Fixed": return "Fijo";
    case "Percentage": return "Porcentaje";
    default: return type;
  }
}

export function DeductionListItem({ deduction, onDelete }: DeductionListItemProps) {
  const handleDelete = () => {
    Alert.alert(
      "Eliminar Deducción",
      `¿Estás seguro de eliminar la deducción "${deduction.label}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onDelete(deduction)
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.label}>{deduction.label}</Text>
          <Text style={styles.amount}>{formatCurrency(deduction.amount)}</Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.nurse}>{deduction.nurseDisplayName}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{deductionTypeLabel(deduction.deductionType)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar deduccion ${deduction.label}`}
      >
        <Text style={styles.deleteButtonText}>x</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
    color: designTokens.color.ink.danger,
    marginLeft: 8,
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
  },
  nurse: {
    fontSize: 13,
    color: designTokens.color.ink.muted,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: designTokens.color.surface.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "500",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.color.surface.danger,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 20,
    color: designTokens.color.ink.danger,
    fontWeight: "bold",
    marginTop: -2,
  },
});
