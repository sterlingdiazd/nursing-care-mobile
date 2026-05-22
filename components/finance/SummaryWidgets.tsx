import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PieChart } from "react-native-gifted-charts";
import { FontAwesome } from "@expo/vector-icons";
import { financeTheme as t } from "./financeTheme";
import { Sparkline } from "./Sparkline";

/** A small donut "gauge" (filled arc vs remainder) with a centered value and a caption. */
export function RingGauge({
  percent,
  color,
  valueLabel,
  label,
  size = 78,
}: {
  percent: number;
  color: string;
  valueLabel: string;
  label: string;
  size?: number;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const data = [
    { value: p <= 0 ? 0.01 : p, color },
    { value: Math.max(0.01, 100 - p), color: t.cardSoft },
  ];
  return (
    <View style={styles.gauge}>
      <PieChart
        donut
        radius={size / 2}
        innerRadius={size / 2 - 8}
        data={data}
        backgroundColor={t.card}
        innerCircleColor={t.card}
        centerLabelComponent={() => <Text style={[styles.gaugeValue, { color }]}>{valueLabel}</Text>}
      />
      <Text style={styles.gaugeLabel}>{label}</Text>
    </View>
  );
}

export function GananciaHero({
  ganancia,
  marginPercent,
  statusColor,
  statusIcon,
  ingresos,
  cobrado,
  marginTrend,
}: {
  ganancia: string;
  marginPercent: number;
  statusColor: string;
  statusIcon: string;
  ingresos: string;
  cobrado: string;
  marginTrend: number[];
}) {
  return (
    <LinearGradient colors={t.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Text style={styles.heroEyebrow}>Ganancia del período</Text>
      <View style={styles.heroValueRow}>
        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{ganancia}</Text>
        <View style={styles.heroBadge}>
          <FontAwesome name={statusIcon as any} size={12} color={statusColor} />
          <Text style={[styles.heroBadgeText, { color: statusColor }]}>Margen {marginPercent.toFixed(1)}%</Text>
        </View>
      </View>
      <Sparkline values={marginTrend} width={240} height={40} color="#BFE9F5" />
      <View style={styles.heroChips}>
        <HeroChip label="Ingresos" value={ingresos} />
        <HeroChip label="Cobrado" value={cobrado} />
      </View>
    </LinearGradient>
  );
}

function HeroChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

export function HealthRow({ items }: { items: { percent: number; color: string; valueLabel: string; label: string }[] }) {
  return (
    <View style={styles.healthRow}>
      {items.map((it, i) => (
        <RingGauge key={i} percent={it.percent} color={it.color} valueLabel={it.valueLabel} label={it.label} />
      ))}
    </View>
  );
}

export function FocusCard({
  title,
  detail,
  value,
  color,
  onPress,
}: {
  title: string;
  detail: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [styles.focus, { borderLeftColor: color }, pressed && onPress ? { opacity: 0.85 } : null]}
    >
      <FontAwesome name="flag" size={16} color={color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.focusTop}>
          <Text style={styles.focusTitle}>{title}</Text>
          <Text style={[styles.focusValue, { color }]}>{value}</Text>
        </View>
        <Text style={styles.focusDetail}>{detail}</Text>
      </View>
      {onPress ? <FontAwesome name="chevron-right" size={12} color={t.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gauge: { flex: 1, alignItems: "center", gap: 6 },
  gaugeValue: { fontWeight: "800", fontSize: 14 },
  gaugeLabel: { color: t.textMuted, fontSize: 11, fontWeight: "700" },
  hero: { borderRadius: t.radius, padding: 20, gap: 10, overflow: "hidden" },
  heroEyebrow: { color: "rgba(234,242,245,0.85)", fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  heroValueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroValue: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", flexShrink: 1 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  heroBadgeText: { fontSize: 12.5, fontWeight: "800" },
  heroChips: { flexDirection: "row", gap: 10 },
  chip: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: t.radiusSm, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  chipLabel: { color: "rgba(234,242,245,0.8)", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase" },
  chipValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  healthRow: { flexDirection: "row", backgroundColor: t.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.cardBorder, padding: 16 },
  focus: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.card, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, borderLeftWidth: 4, padding: 14 },
  focusTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  focusTitle: { color: t.text, fontSize: 14, fontWeight: "800", flex: 1 },
  focusValue: { fontSize: 14, fontWeight: "800" },
  focusDetail: { color: t.textMuted, fontSize: 12.5, lineHeight: 18 },
});
