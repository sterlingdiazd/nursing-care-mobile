import { Pressable, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import type { HealthIndicator, Insight } from "@/src/services/financeService";
import { financeTheme as t, statusColor } from "./financeTheme";

export function HealthCard({ item, onPress }: { item: HealthIndicator; onPress?: () => void }) {
  const c = statusColor(item.status);
  const pct = item.target > 0 ? Math.min(100, Math.max(0, (item.value / item.target) * 100)) : 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [styles.health, { borderLeftColor: c }, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.healthHeader}>
        <View style={[styles.dot, { backgroundColor: c }]} />
        <Text style={styles.healthTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.healthValue, { color: c }]}>{item.valueLabel}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: c }]} />
      </View>
      <Text style={styles.explain} numberOfLines={2}>{item.explanation}</Text>
    </Pressable>
  );
}

export function InsightCard({ item, onPress }: { item: Insight; onPress?: () => void }) {
  const c = item.severity === "danger" ? t.red : item.severity === "warning" ? t.amber : t.accent;
  const icon = item.severity === "info" ? "lightbulb-o" : "exclamation-triangle";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [styles.insight, { borderLeftColor: c }, pressed && onPress ? styles.pressed : null]}
    >
      <FontAwesome name={icon as any} size={18} color={c} style={styles.insightIcon} />
      <View style={styles.insightBody}>
        <Text style={styles.insightTitle}>{item.title}</Text>
        <Text style={styles.insightDetail}>{item.detail}</Text>
      </View>
      {onPress ? <FontAwesome name="chevron-right" size={12} color={t.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  health: {
    backgroundColor: t.card,
    borderRadius: t.radiusSm,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderLeftWidth: 4,
    padding: 14,
    gap: 8,
  },
  healthHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 999 },
  healthTitle: { color: t.text, fontSize: 14, fontWeight: "800", flex: 1 },
  healthValue: { fontSize: 14, fontWeight: "800" },
  track: { height: 6, borderRadius: 999, backgroundColor: t.cardSoft, overflow: "hidden" },
  fill: { height: 6, borderRadius: 999 },
  explain: { color: t.textMuted, fontSize: 12, lineHeight: 17 },
  insight: {
    backgroundColor: t.card,
    borderRadius: t.radiusSm,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderLeftWidth: 4,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  insightIcon: { marginTop: 1 },
  insightBody: { flex: 1, gap: 3 },
  insightTitle: { color: t.text, fontSize: 14, fontWeight: "800" },
  insightDetail: { color: t.textMuted, fontSize: 12.5, lineHeight: 18 },
});
