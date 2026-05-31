import { StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

/** A labelled metric tile (small uppercase label + large value). Used in 2-column KPI grids. */
export function MetricCard({ label, value, color, testID }: { label: string; value: string | number; color?: string; testID?: string }) {
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

/** A horizontal strip of compact stats separated by dividers (e.g., payroll hub header). */
export function StatStrip({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <View style={styles.strip}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={styles.cellRow}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.cell}>
            <Text style={styles.statLabel} numberOfLines={1}>{it.label}</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{it.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  card: { backgroundColor: T.role.surface.raised, borderRadius: T.radius.lg, padding: T.spacing.lg, flex: 1, minWidth: "45%", borderWidth: 1, borderColor: T.role.border.default },
  label: { ...T.text.caption, textTransform: "uppercase", marginBottom: T.spacing.xs },
  value: { ...T.text.title },
  strip: { flexDirection: "row", alignItems: "center", paddingVertical: T.spacing.md, paddingHorizontal: T.spacing.lg, borderRadius: T.radius.xl, backgroundColor: T.role.surface.sunken, borderWidth: 1, borderColor: T.role.border.default },
  cellRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  cell: { flex: 1, alignItems: "center", gap: T.spacing.xs },
  divider: { width: 1, alignSelf: "stretch", backgroundColor: T.role.border.default, marginHorizontal: T.spacing.sm },
  statLabel: { ...T.text.caption, textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center" },
  statValue: { ...T.text.bodyStrong, textAlign: "center" },
});
