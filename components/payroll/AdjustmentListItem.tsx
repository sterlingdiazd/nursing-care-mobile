import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import type { AdminCompensationAdjustmentListItem } from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";

interface AdjustmentListItemProps {
  adjustment: AdminCompensationAdjustmentListItem;
  onDelete: (adjustment: AdminCompensationAdjustmentListItem) => void;
}

function formatCurrency(amount: number) {
  const prefix = amount >= 0 ? "+" : "";
  return prefix + new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(amount);
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-DO", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return dateString;
  }
}

export function AdjustmentListItem({ adjustment, onDelete }: AdjustmentListItemProps) {
  const isPositive = adjustment.amount >= 0;

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Ajuste",
      `¿Estás seguro de eliminar el ajuste "${adjustment.label}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onDelete(adjustment)
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.label}>{adjustment.label}</Text>
          <Text style={[styles.amount, isPositive ? styles.amountPositive : styles.amountNegative]}>
            {formatCurrency(adjustment.amount)}
          </Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.nurse}>{adjustment.nurseDisplayName}</Text>
          <Text style={styles.date}>{formatDate(adjustment.createdAtUtc)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ajuste ${adjustment.label}`}
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
    marginLeft: 8,
  },
  amountPositive: {
    color: designTokens.color.status.successText,
  },
  amountNegative: {
    color: designTokens.color.ink.danger,
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nurse: {
    fontSize: 13,
    color: designTokens.color.ink.muted,
  },
  date: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
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
