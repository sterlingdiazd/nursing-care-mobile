import { Pressable, StyleSheet, Text, View } from "react-native";
import { financeTheme as t, fmtDeltaPercent } from "./financeTheme";

export function KpiCard({
  label,
  value,
  deltaPercent,
  valueColor,
  footnote,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  deltaPercent?: number | null;
  valueColor?: string;
  footnote?: string;
  onPress?: () => void;
  testID?: string;
}) {
  const delta = deltaPercent != null ? fmtDeltaPercent(deltaPercent) : null;
  const up = (deltaPercent ?? 0) >= 0;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={styles.footRow}>
        {delta ? (
          <Text style={[styles.delta, { color: up ? t.green : t.red }]}>
            {up ? "↑" : "↓"} {delta}
          </Text>
        ) : null}
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: t.card,
    borderRadius: t.radiusSm,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 14,
    gap: 6,
  },
  pressed: { opacity: 0.85 },
  label: {
    color: t.textMuted,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  value: {
    color: t.text,
    fontSize: 19,
    fontWeight: "800",
  },
  footRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  delta: { fontSize: 12, fontWeight: "800" },
  footnote: { color: t.textMuted, fontSize: 11, fontWeight: "600" },
});
