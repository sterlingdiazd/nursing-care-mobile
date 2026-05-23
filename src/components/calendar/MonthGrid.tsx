import { Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { CATEGORY_META } from "./serviceCategory";
import type { CalendarDay } from "@/src/hooks/useServiceCalendar";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

/** Month grid: 6 weeks of day cells with category color dots + an unassigned marker. */
export function MonthGrid({
  days,
  selectedDay,
  onSelectDay,
}: {
  days: CalendarDay[];
  selectedDay: string;
  onSelectDay: (iso: string) => void;
}) {
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((d) => {
            const selected = d.iso === selectedDay;
            const dayNum = Number(d.iso.slice(8, 10));
            return (
              <Pressable
                key={d.iso}
                onPress={() => onSelectDay(d.iso)}
                accessibilityRole="button"
                accessibilityLabel={`Día ${dayNum}${d.count ? `, ${d.count} servicios` : ""}`}
                accessibilityState={{ selected }}
                testID={`calendar-day-${d.iso}`}
                style={[styles.cell, selected && styles.cellSelected, d.isToday && !selected && styles.cellToday]}
              >
                <Text style={[styles.dayNum, !d.inMonth && styles.dayNumMuted, selected && styles.dayNumSelected]}>
                  {dayNum}
                </Text>
                <View style={styles.dots}>
                  {d.categories.slice(0, 3).map((c) => (
                    <View key={c} style={[styles.dot, { backgroundColor: CATEGORY_META[c].color }]} />
                  ))}
                </View>
                {d.hasUnassigned ? <View style={styles.unassignedFlag} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  card: {
    backgroundColor: T.color.surface.primary,
    borderRadius: T.radius.lg,
    borderWidth: 1,
    borderColor: T.color.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
    elevation: 2,
    padding: 8,
  },
  headerRow: { flexDirection: "row", paddingBottom: 6 },
  weekday: { flex: 1, textAlign: "center", color: T.color.ink.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  week: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
    borderRadius: T.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  cellSelected: { backgroundColor: T.color.ink.accent },
  cellToday: { backgroundColor: T.color.surface.accent },
  dayNum: { color: T.color.ink.primary, fontSize: 14, fontWeight: "700" },
  dayNumMuted: { color: T.color.ink.muted, opacity: 0.55 },
  dayNumSelected: { color: T.color.ink.inverse, fontWeight: "800" },
  dots: { flexDirection: "row", gap: 2, height: 6, alignItems: "center" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  unassignedFlag: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.color.status.dangerText,
  },
});
