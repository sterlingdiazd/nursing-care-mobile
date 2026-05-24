import { Pressable, StyleSheet, Text, View } from "react-native";
import { financeTheme as t } from "./financeTheme";
import { hapticFeedback } from "@/src/utils/haptics";

export function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              hapticFeedback.selection();
              onChange(tab.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.tab, on ? styles.tabActive : null]}
          >
            <Text style={[styles.label, on ? styles.labelActive : null]} numberOfLines={1}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bar: light secondary surface (surface.secondary / tertiary) with subtle border
  bar: {
    flexDirection: "row",
    backgroundColor: t.bgElevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  // Active pill: teal accent fill
  tabActive: { backgroundColor: t.accent },
  // Inactive: muted label on light bg
  label: { color: t.textMuted, fontSize: 12.5, fontWeight: "700" },
  // Active: white label on teal pill
  labelActive: { color: "#ffffff", fontWeight: "800" },
});
