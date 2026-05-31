import { Pressable, StyleSheet, Text, View } from "react-native";
import { financeTheme as t } from "./financeTheme";
import { hapticFeedback } from "@/src/utils/haptics";
import { designTokens } from "@/src/design-system/tokens";

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
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: designTokens.spacing.xs,
    gap: designTokens.spacing.xs,
  },
  tab: { flex: 1, paddingVertical: designTokens.spacing.md, borderRadius: designTokens.radius.pill, alignItems: "center", justifyContent: "center" },
  // Active pill: teal accent fill
  tabActive: { backgroundColor: t.accent },
  // Inactive: muted label on light bg
  label: { color: t.textMuted, fontSize: designTokens.typography.label.fontSize, fontWeight: "700" },
  // Active: white label on teal pill
  labelActive: { color: designTokens.color.ink.inverse, fontWeight: "800" },
});
