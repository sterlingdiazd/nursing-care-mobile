import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import type { AdminDeductionListItem } from "@/src/services/payrollService";

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
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9f9f9",
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
    color: "#333",
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#dc2626",
    marginLeft: 8,
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
  },
  nurse: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  typeBadge: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    color: "#1976d2",
    fontWeight: "500",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 20,
    color: "#dc2626",
    fontWeight: "bold",
    marginTop: -2,
  },
});