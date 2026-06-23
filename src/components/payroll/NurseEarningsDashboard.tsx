import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { designTokens } from "@/src/design-system/tokens";

interface NurseEarningsDashboardProps {
  data: { date: string; amount: number }[];
}

export function NurseEarningsDashboard({ data }: NurseEarningsDashboardProps) {
  const chartData = data.map((item) => ({
    value: item.amount,
    label: `${item.date.slice(8)}-${item.date.slice(5, 7)}`,
    frontColor: designTokens.color.ink.accent,
  }));

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ingresos del Período</Text>
      <Text style={styles.total}>{new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(total)}</Text>
      <BarChart
        data={chartData}
        barWidth={24}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={0}
        isAnimated
        animationDuration={800}
        labelWidth={30}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    marginBottom: designTokens.spacing.lg,
  },
  title: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.secondary,
  },
  total: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.color.status.successText,
    marginBottom: designTokens.spacing.md,
  },
});
