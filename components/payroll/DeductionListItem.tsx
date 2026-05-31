import { Pressable, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import type { AdminDeductionListItem } from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";
import { hapticFeedback } from "@/src/utils/haptics";

interface DeductionListItemProps {
  deduction: AdminDeductionListItem;
  onDelete: (deduction: AdminDeductionListItem) => void;
  onPress?: (deduction: AdminDeductionListItem) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(amount);
}

function deductionTypeLabel(type: string): string {
  switch (type) {
    case "Loan": return "Préstamo";
    case "Advance": return "Adelanto";
    case "Insurance": return "Seguro";
    case "Other": return "Otro";
    default: return type;
  }
}

export function DeductionListItem({ deduction, onDelete, onPress }: DeductionListItemProps) {
  const handleDelete = () => {
    hapticFeedback.selection();
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

  const handlePress = onPress
    ? () => {
        hapticFeedback.selection();
        onPress(deduction);
      }
    : undefined;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.content}
        onPress={handlePress}
        testID={`deduction-item-${deduction.id}`}
        nativeID={`deduction-item-${deduction.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Editar deducción ${deduction.label}`}
      >
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
      </Pressable>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar deducción ${deduction.label}`}
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
    color: designTokens.color.ink.danger,
    marginLeft: designTokens.spacing.sm,
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
  },
  nurse: {
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.muted,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: designTokens.color.surface.accent,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radius.sm,
  },
  typeText: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "500",
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
