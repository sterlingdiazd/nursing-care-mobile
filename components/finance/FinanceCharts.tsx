import { type ComponentProps, type ReactNode } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { LineChart, PieChart } from "react-native-gifted-charts";
import type { CategoryMargin, ClientRevenueRow, TrendPoint } from "@/src/services/financeService";
import { financeTheme as t, fmtMoneyCompact } from "./financeTheme";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { designTokens, type PaletteHue } from "@/src/design-system/tokens";
import { IconBadge } from "@/src/components/shared/IconBadge";
import { withHapticFeedback } from "@/src/utils/haptics";

const W = Dimensions.get("window").width;
const CHART_W = W - 68; // screen padding (18*2) + card padding (16*2)
// Slice colours: teal accent + status palette + muted — all legible on white
const SLICE_COLORS = [
  t.accent,
  "#7C5CFC",
  t.green,
  t.amber,
  t.red,
  t.textMuted,
];

export function SectionCard({
  title,
  subtitle,
  children,
  onPress,
  icon,
  hue,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onPress?: () => void;
  icon?: ComponentProps<typeof FontAwesome>["name"];
  hue?: PaletteHue;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      style={({ pressed }: { pressed?: boolean }) => [styles.section, pressed && onPress ? { opacity: 0.9 } : null]}
      onPress={onPress ? withHapticFeedback(onPress, "selection") : undefined}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleLeft}>
          {icon && hue ? <IconBadge icon={icon} hue={hue} size={28} iconSize={15} /> : null}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {onPress ? <FontAwesome name="chevron-right" size={12} color={t.textMuted} /> : null}
      </View>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </Wrapper>
  );
}

export function RevenueDonut({ data }: { data: CategoryMargin[] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0) || 1;
  const pie = data.map((d, i) => ({ value: d.revenue, color: SLICE_COLORS[i % SLICE_COLORS.length] }));
  return (
    <View style={styles.donutRow}>
      <PieChart
        donut
        radius={66}
        innerRadius={44}
        data={pie}
        // White donut background
        backgroundColor={t.card}
        innerCircleColor={t.card}
        centerLabelComponent={() => (
          <View style={{ alignItems: "center" }}>
            <Text style={styles.donutCenterLabel}>Ingresos</Text>
            <Text style={styles.donutCenterValue}>{fmtMoneyCompact(total)}</Text>
          </View>
        )}
      />
      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={d.category} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{d.displayName}</Text>
            <Text style={styles.legendPct}>{Math.round((d.revenue / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TrendArea({ data }: { data: TrendPoint[] }) {
  const revenue = data.map((p) => ({ value: p.revenue, label: p.label.slice(0, 2) }));
  const margin = data.map((p) => ({ value: p.margin }));
  // Canvas colour for the area fill fade-to (from the shared token)
  const canvasFade = designTokens.color.surface.canvas;
  return (
    <View>
      <View style={styles.trendLegend}>
        <Legend color={t.accent} text="Ingresos" />
        <Legend color={t.green} text="Margen" />
      </View>
      <LineChart
        areaChart
        curved
        data={revenue}
        data2={margin}
        width={CHART_W - 48}
        height={150}
        hideDataPoints
        thickness={2}
        color1={t.accent}
        color2={t.green}
        startFillColor1={t.accent}
        // Area fill fades to canvas, not dark navy
        endFillColor1={canvasFade}
        startOpacity={0.35}
        endOpacity={0.02}
        yAxisThickness={0}
        xAxisThickness={0}
        hideRules
        noOfSections={3}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        backgroundColor="transparent"
      />
    </View>
  );
}

export function TopClientsBars({ data }: { data: ClientRevenueRow[] }) {
  const top = data.slice(0, 5);
  const max = Math.max(...top.map((d) => d.billed), 1);
  return (
    <View style={{ gap: 12 }}>
      {top.map((d, i) => (
        <View key={`${d.clientName}-${i}`} style={{ gap: 5 }}>
          <View style={styles.barHeader}>
            <Text style={styles.barLabel} numberOfLines={1}>{d.clientName}</Text>
            <Text style={styles.barValue}>{fmtMoneyCompact(d.billed)}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(4, (d.billed / max) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendRow2}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel2}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // White card with soft shadow
  section: {
    ...mobileSurfaceCard,
    padding: 16,
    gap: 4,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitleLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  sectionTitle: { color: t.text, fontSize: 16, fontWeight: "800" },
  sectionSub: { color: t.textMuted, fontSize: 12 },
  sectionBody: { marginTop: 10 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  donutCenterLabel: { color: t.textMuted, fontSize: 10 },
  donutCenterValue: { color: t.text, fontSize: 13, fontWeight: "800" },
  legend: { flex: 1, gap: 9 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendRow2: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { color: t.text, fontSize: 13, flex: 1 },
  legendLabel2: { color: t.textMuted, fontSize: 12, fontWeight: "600" },
  legendPct: { color: t.textMuted, fontSize: 12, fontWeight: "700" },
  trendLegend: { flexDirection: "row", gap: 14, marginBottom: 8 },
  axisText: { color: t.textMuted, fontSize: 10 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  barLabel: { color: t.text, fontSize: 13, flex: 1 },
  barValue: { color: t.textMuted, fontSize: 12, fontWeight: "700" },
  // Bar track: light neutral (#e6f2f4)
  barTrack: { height: 8, borderRadius: 999, backgroundColor: t.cardSoft, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999, backgroundColor: t.accent },
});
