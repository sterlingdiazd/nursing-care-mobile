import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import type { AdminCompensationAdjustmentListItem } from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { hapticFeedback } from "@/src/utils/haptics";

interface AdjustmentListItemProps {
  adjustment: AdminCompensationAdjustmentListItem;
  onDelete: (adjustment: AdminCompensationAdjustmentListItem) => void;
  onEdit: (adjustment: AdminCompensationAdjustmentListItem) => void;
}

function formatCurrency(amount: number) {
  const prefix = amount >= 0 ? "+" : "";
  return prefix + new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(amount);
}

function formatDate(dateString: string): string {
  return formatDateTimeES(dateString) || dateString;
}

export function AdjustmentListItem({ adjustment, onDelete, onEdit }: AdjustmentListItemProps) {
  const isPositive = adjustment.amount >= 0;

  const handleDelete = () => {
    hapticFeedback.selection();
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

  const handleEdit = () => {
    hapticFeedback.selection();
    onEdit(adjustment);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={handleEdit}
        accessibilityRole="button"
        accessibilityLabel={`Editar ajuste ${adjustment.label}`}
      >
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
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ajuste ${adjustment.label}`}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.05)",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: designTokens.spacing.xs,
  },
  label: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    flex: 1,
  },
  amount: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "bold",
    marginLeft: designTokens.spacing.sm,
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
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.muted,
  },
  date: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.muted,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: designTokens.radius.lg,
    backgroundColor: designTokens.color.surface.danger,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: designTokens.spacing.sm,
  },
  deleteButtonText: {
    fontSize: designTokens.typography.section.fontSize,
    color: designTokens.color.ink.danger,
    fontWeight: "bold",
    marginTop: -2,
  },
});
