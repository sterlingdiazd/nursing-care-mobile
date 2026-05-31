import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { financeTheme as t } from "./financeTheme";
import { hapticFeedback } from "@/src/utils/haptics";
import { isAtLatest, labelFor, type Granularity } from "./periodRange";
import { designTokens } from "@/src/design-system/tokens";

// Re-export the pure range helpers so callers can import everything finance-period
// related from one place; the math itself lives in ./periodRange (unit-tested).
export { rangeFor, shiftAnchor, labelFor, isAtLatest } from "./periodRange";
export type { Granularity, PeriodRange } from "./periodRange";

const GRAN_TABS: { key: Granularity; label: string; a11y: string }[] = [
  { key: "month", label: "Mes", a11y: "Vista por mes" },
  { key: "quarter", label: "Trim", a11y: "Vista por trimestre" },
  { key: "year", label: "Año", a11y: "Vista por año" },
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="button"
              accessibilityLabel={g.a11y}
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
  wrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md, marginBottom: designTokens.spacing.md },
  nav: { flexDirection: "row", alignItems: "center", flex: 1, gap: designTokens.spacing.sm },
  // 40x40 visual + 8pt hitSlop => 56pt effective touch target (>=44 AA).
  arrow: {
    width: 40, height: 40, borderRadius: designTokens.radius.pill, alignItems: "center", justifyContent: "center",
    backgroundColor: t.bgElevated, borderWidth: 1, borderColor: t.cardBorder,
  },
  // Disabled cue via a subtle filled background (no opacity stack) so the muted glyph
  // (#5B6B7F on #E2E8F0 ~ 4:1) still clears WCAG non-text contrast.
  arrowDisabled: { backgroundColor: t.cardSoft, borderColor: t.cardSoft },
  arrowGlyph: { color: t.text, fontSize: designTokens.typography.section.fontSize, fontWeight: "800", lineHeight: 22 },
  arrowGlyphDisabled: { color: t.textMuted },
  label: { flex: 1, textAlign: "center", color: t.text, fontSize: designTokens.typography.body.fontSize, fontWeight: "800" },
  gran: {
    flexDirection: "row", backgroundColor: t.bgElevated, borderRadius: designTokens.radius.pill,
    borderWidth: 1, borderColor: t.cardBorder, padding: designTokens.spacing.xs, gap: designTokens.spacing.xs,
  },
  granTab: { paddingVertical: designTokens.spacing.sm, paddingHorizontal: designTokens.spacing.md, borderRadius: designTokens.radius.pill, alignItems: "center", justifyContent: "center" },
  granTabActive: { backgroundColor: t.accent },
  granLabel: { color: t.textMuted, fontSize: designTokens.typography.caption.fontSize, fontWeight: "700" },
  granLabelActive: { color: designTokens.color.ink.inverse, fontWeight: "800" },
});
