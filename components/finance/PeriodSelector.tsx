import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { financeTheme as t } from "./financeTheme";
import { hapticFeedback } from "@/src/utils/haptics";

export type Granularity = "month" | "quarter" | "year";

export interface PeriodRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m1: number, d: number) => `${y}-${pad(m1)}-${pad(d)}`;
// Last calendar day of the given 0-based month.
const lastDay = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/**
 * Inclusive from/to (YYYY-MM-DD) for a granularity anchored at a date. The anchor's
 * day-of-month is irrelevant; only year/month are used. The upper bound is capped at
 * today so the current quarter/year reads as accumulated-to-date instead of padding
 * with empty future months.
 */
export function rangeFor(granularity: Granularity, anchor: Date): PeriodRange {
  const y = anchor.getFullYear();
  const m0 = anchor.getMonth();
  const today = new Date();
  const todayIso = iso(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const cap = (to: string) => (to > todayIso ? todayIso : to);

  if (granularity === "month") {
    return { from: iso(y, m0 + 1, 1), to: cap(iso(y, m0 + 1, lastDay(y, m0))) };
  }
  if (granularity === "quarter") {
    const q0 = Math.floor(m0 / 3) * 3; // first month of quarter (0-based)
    return { from: iso(y, q0 + 1, 1), to: cap(iso(y, q0 + 3, lastDay(y, q0 + 2))) };
  }
  return { from: iso(y, 1, 1), to: cap(iso(y, 12, 31)) };
}

export function labelFor(granularity: Granularity, anchor: Date): string {
  const y = anchor.getFullYear();
  if (granularity === "month") {
    const name = MONTHS_ES[anchor.getMonth()];
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
  }
  if (granularity === "quarter") return `T${Math.floor(anchor.getMonth() / 3) + 1} ${y}`;
  return `${y}`;
}

/** Shift by ±1 unit of the granularity, normalized to day 1 to avoid month-length overflow. */
export function shiftAnchor(granularity: Granularity, anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  if (granularity === "month") d.setMonth(d.getMonth() + dir);
  else if (granularity === "quarter") d.setMonth(d.getMonth() + dir * 3);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

/** True when the anchored period is the latest (current) one — used to disable "next". */
export function isAtLatest(granularity: Granularity, anchor: Date): boolean {
  const now = new Date();
  const ay = anchor.getFullYear();
  if (granularity === "year") return ay >= now.getFullYear();
  if (granularity === "quarter") {
    return ay > now.getFullYear() ||
      (ay === now.getFullYear() && Math.floor(anchor.getMonth() / 3) >= Math.floor(now.getMonth() / 3));
  }
  return ay > now.getFullYear() || (ay === now.getFullYear() && anchor.getMonth() >= now.getMonth());
}

const GRAN_TABS: { key: Granularity; label: string }[] = [
  { key: "month", label: "Mes" },
  { key: "quarter", label: "Trim" },
  { key: "year", label: "Año" },
];

export function PeriodSelector({
  granularity,
  anchor,
  onChangeGranularity,
  onStep,
}: {
  granularity: Granularity;
  anchor: Date;
  onChangeGranularity: (g: Granularity) => void;
  onStep: (dir: -1 | 1) => void;
}) {
  const atLatest = isAtLatest(granularity, anchor);
  const label = useMemo(() => labelFor(granularity, anchor), [granularity, anchor]);

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => { hapticFeedback.selection(); onStep(-1); }}
          style={styles.arrow}
          accessibilityRole="button"
          accessibilityLabel="Período anterior"
          testID="finance-period-prev"
          nativeID="finance-period-prev"
        >
          <Text style={styles.arrowGlyph}>‹</Text>
        </Pressable>
        <Text
          style={styles.label}
          numberOfLines={1}
          testID="finance-period-label"
          nativeID="finance-period-label"
        >
          {label}
        </Text>
        <Pressable
          onPress={() => { if (atLatest) return; hapticFeedback.selection(); onStep(1); }}
          style={[styles.arrow, atLatest ? styles.arrowDisabled : null]}
          disabled={atLatest}
          accessibilityRole="button"
          accessibilityLabel="Período siguiente"
          accessibilityState={{ disabled: atLatest }}
          testID="finance-period-next"
          nativeID="finance-period-next"
        >
          <Text style={[styles.arrowGlyph, atLatest ? styles.arrowGlyphDisabled : null]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.gran}>
        {GRAN_TABS.map((g) => {
          const on = g.key === granularity;
          return (
            <Pressable
              key={g.key}
              onPress={() => { hapticFeedback.selection(); onChangeGranularity(g.key); }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.granTab, on ? styles.granTabActive : null]}
              testID={`finance-gran-${g.key}`}
              nativeID={`finance-gran-${g.key}`}
            >
              <Text style={[styles.granLabel, on ? styles.granLabelActive : null]}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  nav: { flexDirection: "row", alignItems: "center", flex: 1, gap: 6 },
  arrow: {
    width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center",
    backgroundColor: t.bgElevated, borderWidth: 1, borderColor: t.cardBorder,
  },
  arrowDisabled: { opacity: 0.4 },
  arrowGlyph: { color: t.text, fontSize: 20, fontWeight: "800", lineHeight: 22 },
  arrowGlyphDisabled: { color: t.textMuted },
  label: { flex: 1, textAlign: "center", color: t.text, fontSize: 14.5, fontWeight: "800" },
  gran: {
    flexDirection: "row", backgroundColor: t.bgElevated, borderRadius: 999,
    borderWidth: 1, borderColor: t.cardBorder, padding: 3, gap: 3,
  },
  granTab: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  granTabActive: { backgroundColor: t.accent },
  granLabel: { color: t.textMuted, fontSize: 12, fontWeight: "700" },
  granLabelActive: { color: "#ffffff", fontWeight: "800" },
});
