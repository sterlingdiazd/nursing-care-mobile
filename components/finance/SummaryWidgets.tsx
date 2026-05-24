import { Pressable, StyleSheet, Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { FontAwesome } from "@expo/vector-icons";
import { financeTheme as t } from "./financeTheme";
import { Sparkline } from "./Sparkline";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { withHapticFeedback } from "@/src/utils/haptics";

/** A small donut "gauge" (filled arc vs remainder) with a centered value and a caption. */
export function RingGauge({
  percent,
  color,
  valueLabel,
  label,
  size = 78,
  onPress,
}: {
  percent: number;
  color: string;
  valueLabel: string;
  label: string;
  size?: number;
  onPress?: () => void;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const data = [
    { value: p <= 0 ? 0.01 : p, color },
    // Track: light neutral surface (surface.tertiary)
    { value: Math.max(0.01, 100 - p), color: t.cardSoft },
  ];
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      style={({ pressed }: { pressed?: boolean }) => [styles.gauge, pressed && onPress ? { opacity: 0.7 } : null]}
      onPress={onPress ? withHapticFeedback(onPress, "selection") : undefined}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Ver detalle de ${label}` : undefined}
    >
      <PieChart
        donut
        radius={size / 2}
        innerRadius={size / 2 - 8}
        data={data}
        // White card background for donut interior
        backgroundColor={t.card}
        innerCircleColor={t.card}
        centerLabelComponent={() => <Text style={[styles.gaugeValue, { color }]}>{valueLabel}</Text>}
      />
      <Text style={styles.gaugeLabel}>{label}</Text>
    </Wrapper>
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
  // Determine margin status for the badge pill
  const band = marginPercent >= 40 ? "green" : marginPercent >= 30 ? "amber" : "red";
  const badgeBg =
    band === "green" ? t.greenBg : band === "amber" ? t.amberBg : t.redBg;

  return (
    // White mobileSurfaceCard — no hero gradient
    <View style={styles.hero}>
      <Text style={styles.heroEyebrow}>Ganancia del período</Text>
      {/* Hero number on its own full-width line so it never truncates */}
      <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{ganancia}</Text>
      {/* Status pill below the number: tinted success/warning/danger surface */}
      <View style={[styles.heroBadge, styles.heroBadgeStandalone, { backgroundColor: badgeBg }]}>
        <FontAwesome name={statusIcon as any} size={12} color={statusColor} />
        <Text style={[styles.heroBadgeText, { color: statusColor }]}>Margen {marginPercent.toFixed(1)}%</Text>
      </View>
      {/* Sparkline: teal accent stroke on white background */}
      <Sparkline values={marginTrend} width={240} height={40} color={t.accent} />
      <View style={styles.heroChips}>
        <HeroChip label="Ingresos" value={ingresos} />
        <HeroChip label="Cobrado" value={cobrado} />
      </View>
    </View>
  );
}

function HeroChip({ label, value }: { label: string; value: string }) {
  return (
    // Sub-tile: light secondary surface with navy text
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

export function HealthRow({ items }: { items: { percent: number; color: string; valueLabel: string; label: string; onPress?: () => void }[] }) {
  return (
    <View style={styles.healthRow}>
      {items.map((it, i) => (
        <RingGauge key={i} percent={it.percent} color={it.color} valueLabel={it.valueLabel} label={it.label} onPress={it.onPress} />
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
  // Background: choose a light status surface based on the rail color.
  // We pick the closest match by comparing to the three status text colors.
  const bgForColor = (): string => {
    if (color === t.green) return t.greenBg;
    if (color === t.amber) return t.amberBg;
    if (color === t.red) return t.redBg;
    return t.card;
  };

  return (
    <Pressable
      onPress={onPress ? withHapticFeedback(onPress, "selection") : undefined}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.focus,
        { borderLeftColor: color, backgroundColor: bgForColor() },
        pressed && onPress ? { opacity: 0.85 } : null,
      ]}
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

  // Hero: white card with soft shadow (mobileSurfaceCard spread)
  hero: {
    ...mobileSurfaceCard,
    padding: 20,
    gap: 10,
    overflow: "hidden",
  },
  heroEyebrow: { color: t.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  // Large navy hero number — full width, one emphasized number per card
  heroValue: { color: t.text, fontSize: 34, fontWeight: "800" },
  // Tinted status pill (successBg / warningBg / dangerBg)
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  heroBadgeStandalone: { alignSelf: "flex-start" },
  heroBadgeText: { fontSize: 12.5, fontWeight: "800" },
  heroChips: { flexDirection: "row", gap: 10 },
  // Sub-tiles: light secondary surface (#f3f9fa) with navy text
  chip: { flex: 1, backgroundColor: t.bgElevated, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  chipLabel: { color: t.textMuted, fontSize: 10.5, fontWeight: "700", textTransform: "uppercase" },
  chipValue: { color: t.text, fontSize: 15, fontWeight: "800" },

  // Health ring row: white card
  healthRow: { flexDirection: "row", ...mobileSurfaceCard, padding: 16 },

  // Focus card: light status surface + 4px left rail
  focus: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: t.radiusSm, borderWidth: 1, borderColor: t.cardBorder, borderLeftWidth: 4, padding: 14 },
  focusTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  focusTitle: { color: t.text, fontSize: 14, fontWeight: "800", flex: 1 },
  focusValue: { fontSize: 14, fontWeight: "800" },
  focusDetail: { color: t.textMuted, fontSize: 12.5, lineHeight: 18 },
});
