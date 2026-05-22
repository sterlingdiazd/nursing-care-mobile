import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { TrendPoint } from "@/src/services/financeService";
import { financeTheme as t, fmtMoney, fmtDeltaPercent } from "./financeTheme";
import { Sparkline } from "./Sparkline";

export function HeroMetric({
  label,
  value,
  deltaPercent,
  collected,
  trend,
}: {
  label: string;
  value: number;
  deltaPercent: number | null;
  collected: number;
  trend: TrendPoint[];
}) {
  const up = (deltaPercent ?? 0) >= 0;
  const delta = fmtDeltaPercent(deltaPercent);
  const series = trend.map((p) => p.revenue);

  return (
    <LinearGradient
      colors={t.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {fmtMoney(value)}
        </Text>
        {delta ? (
          <View style={[styles.deltaPill, { backgroundColor: up ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)" }]}>
            <Text style={[styles.deltaText, { color: up ? t.green : t.red }]}>
              {up ? "↑" : "↓"} {delta}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.sub}>Cobrado: {fmtMoney(collected)}</Text>
      <View style={styles.spark}>
        <Sparkline values={series} width={220} height={44} color="#BFE9F5" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: t.radius,
    padding: 20,
    overflow: "hidden",
  },
  label: {
    color: "rgba(234,242,245,0.85)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    flexShrink: 1,
  },
  deltaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: "800",
  },
  sub: {
    color: "rgba(234,242,245,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  spark: {
    marginTop: 12,
    opacity: 0.95,
  },
});
