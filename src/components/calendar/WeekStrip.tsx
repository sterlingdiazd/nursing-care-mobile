import { Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { CATEGORY_META } from "./serviceCategory";
import type { CalendarDay } from "@/src/hooks/useServiceCalendar";
import { hapticFeedback } from "@/src/utils/haptics";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

/** Week selector: 7 day columns with category dots; the selected day drives DayDetail. */
export function WeekStrip({
  days,
  selectedDay,
  onSelectDay,
}: {
  days: CalendarDay[];
  selectedDay: string;
  onSelectDay: (iso: string) => void;
}) {
  return (
    <View style={styles.card}>
      {days.map((d, i) => {
        const selected = d.iso === selectedDay;
        const dayNum = Number(d.iso.slice(8, 10));
        return (
          <Pressable
            key={d.iso}
            onPress={() => {
              hapticFeedback.selection();
              onSelectDay(d.iso);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${WEEKDAYS[i]} ${dayNum}${d.count ? `, ${d.count} servicios` : ""}`}
            accessibilityState={{ selected }}
            testID={`calendar-week-day-${d.iso}`}
            style={[styles.col, selected && styles.colSelected, d.isToday && !selected && styles.colToday]}
          >
            <Text style={[styles.weekday, selected && styles.textSelected]}>{WEEKDAYS[i]}</Text>
            <Text style={[styles.dayNum, selected && styles.textSelected]}>{dayNum}</Text>
            <View style={styles.dots}>
              {d.categories.slice(0, 3).map((c) => (
                <View key={c} style={[styles.dot, { backgroundColor: selected ? T.color.ink.inverse : CATEGORY_META[c].color }]} />
              ))}
            </View>
            {d.hasUnassigned ? <View style={styles.unassignedFlag} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: T.color.surface.primary,
    borderRadius: T.radius.lg,
    borderWidth: 1,
    borderColor: T.color.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
    elevation: 2,
    padding: 6,
    gap: 4,
  },
  col: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: T.radius.md, gap: 4 },
  colSelected: { backgroundColor: T.color.ink.accent },
  colToday: { backgroundColor: T.color.surface.accent },
  weekday: { color: T.color.ink.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  dayNum: { color: T.color.ink.primary, fontSize: 16, fontWeight: "800" },
  textSelected: { color: T.color.ink.inverse },
  dots: { flexDirection: "row", gap: 2, height: 6, alignItems: "center" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  unassignedFlag: { position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: T.color.status.dangerText },
});
