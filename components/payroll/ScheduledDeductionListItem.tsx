import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ScheduledDeductionListItem as ScheduledDeductionListItemType } from "@/src/services/payrollTypes";
import { designTokens } from "@/src/design-system/tokens";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import { formatDateES } from "@/src/utils/spanishTextValidator";

interface ScheduledDeductionListItemProps {
  item: ScheduledDeductionListItemType;
  onPress: (id: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function conceptLabel(deductionType: string): string {
  switch (deductionType) {
    case "Loan": return "Préstamo";
    case "Advance": return "Adelanto";
    case "Insurance": return "Seguro Médico";
    case "Other": return "Otro";
    default: return deductionType;
  }
}

function modalityLabel(modality: string): string {
  switch (modality) {
    case "Amortizing": return "Amortizable";
    case "RecurringFixed": return "Recurrente fija";
    case "OneTime": return "Única";
    default: return modality;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "Active": return "Activa";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    default: return status;
  }
}

export function ScheduledDeductionListItem({ item, onPress }: ScheduledDeductionListItemProps) {
  const isAmortizing = item.modality === "Amortizing";
  const statusStyle =
    item.status === "Active"
      ? styles.statusActive
      : item.status === "Completed"
        ? styles.statusCompleted
        : styles.statusCancelled;
  const statusTextStyle =
    item.status === "Active"
      ? styles.statusTextActive
      : item.status === "Completed"
        ? styles.statusTextCompleted
        : styles.statusTextCancelled;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item.id)}
      testID={adminTestIds.payroll.scheduledListItem(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Descuento fijo ${item.label} de ${item.nurseDisplayName}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          <Text style={styles.conceptRow}>
            {conceptLabel(item.deductionType)} · {modalityLabel(item.modality)}
          </Text>
        </View>
        <View style={[styles.statusBadge, statusStyle]}>
          <Text style={[styles.statusText, statusTextStyle]}>{statusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.nurse} numberOfLines={1}>{item.nurseDisplayName}</Text>

      {isAmortizing ? (
        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Saldo</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.remainingBalance)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Cuotas</Text>
            <Text style={styles.metricValue}>{item.installmentsPaid}/{item.totalInstallments}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Cuota</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.installmentAmount)}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Monto</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.recurringAmount)}</Text>
          </View>
          {item.maxOccurrences != null ? (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Ocurrencias</Text>
                <Text style={styles.metricValue}>{item.installmentsGenerated}/{item.maxOccurrences}</Text>
              </View>
            </>
          ) : item.endDate ? (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Fin</Text>
                <Text style={styles.metricValue}>{formatDateES(item.endDate)}</Text>
              </View>
            </>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.05)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  titleWrap: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  conceptRow: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusActive: {
    backgroundColor: designTokens.color.surface.success,
  },
  statusCompleted: {
    backgroundColor: designTokens.color.surface.tertiary,
  },
  statusCancelled: {
    backgroundColor: designTokens.color.surface.danger,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextActive: {
    color: designTokens.color.status.successText,
  },
  statusTextCompleted: {
    color: designTokens.color.ink.secondary,
  },
  statusTextCancelled: {
    color: designTokens.color.status.dangerText,
  },
  nurse: {
    fontSize: 13,
    color: designTokens.color.ink.muted,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: designTokens.color.surface.tertiary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricCell: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: designTokens.color.border.subtle,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
});
