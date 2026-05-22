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
  card: { backgroundColor: T.color.surface.primary, borderRadius: 16, padding: 16, flex: 1, minWidth: "45%", borderWidth: 1, borderColor: T.color.border.subtle },
  label: { fontSize: 11, fontWeight: "700", color: T.color.ink.muted, textTransform: "uppercase", marginBottom: 4 },
  value: { fontSize: 24, fontWeight: "800", color: T.color.ink.primary },
  strip: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderRadius: T.radius.xl, backgroundColor: T.color.surface.secondary, borderWidth: 1, borderColor: T.color.border.subtle },
  cellRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  cell: { flex: 1, alignItems: "center", gap: 2 },
  divider: { width: 1, alignSelf: "stretch", backgroundColor: T.color.border.subtle, marginHorizontal: 6 },
  statLabel: { fontSize: 10, fontWeight: "700", color: T.color.ink.muted, textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center" },
  statValue: { fontSize: 16, fontWeight: "800", color: T.color.ink.primary, textAlign: "center" },
});
