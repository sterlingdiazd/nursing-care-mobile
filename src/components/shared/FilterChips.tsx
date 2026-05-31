import { StyleSheet, Text, View, Pressable } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { hapticFeedback } from "@/src/utils/haptics";

export interface FilterChipOption<K extends string = string> {
  key: K;
  label: string;
  /** Optional count badge rendered inside the chip (work-pending counts, etc.). */
  count?: number;
}

interface FilterChipsProps<K extends string> {
  options: ReadonlyArray<FilterChipOption<K>>;
  value: K;
  onChange: (key: K) => void;
  /** Prefix for per-chip testID/nativeID, e.g. "admin-notifications-filter" -> "...-active". */
  testIDPrefix?: string;
}

/**
 * Canonical filter-chip cluster with optional count badges. Wraps onto multiple
 * rows so every filter is visible at once — no horizontal scroll, no off-screen
 * options. Active chip uses the accent fill; counts come from the paginated
 * response, never client length.
 */
export function FilterChips<K extends string>({ options, value, onChange, testIDPrefix }: FilterChipsProps<K>) {
  const handleChange = (key: K) => {
    if (key === value) return;
    hapticFeedback.selection();
    onChange(key);
  };

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.key === value;
        const id = testIDPrefix ? `${testIDPrefix}-${String(opt.key).toLowerCase()}` : undefined;
        return (
          <Pressable
            key={opt.key}
            onPress={() => handleChange(opt.key)}
            accessibilityRole="button"
            accessibilityLabel={`Filtro ${opt.label}`}
            accessibilityState={{ selected: active }}
            testID={id}
            nativeID={id}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
            {typeof opt.count === "number" ? (
              <View style={[styles.count, active && styles.countActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{opt.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  // Wrapping cluster: all chips visible across as many rows as needed (no scroll).
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: designTokens.spacing.sm, paddingVertical: designTokens.spacing.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: T.radius.pill,
    backgroundColor: T.color.surface.secondary,
    borderWidth: 1,
    borderColor: T.color.border.subtle,
  },
  chipActive: {
    backgroundColor: T.color.ink.accent,
    borderColor: T.color.ink.accentStrong,
  },
  label: {
    color: T.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  labelActive: { color: T.color.ink.inverse },
  count: {
    minWidth: 18,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 1,
    borderRadius: T.radius.pill,
    backgroundColor: T.color.surface.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  countActive: { backgroundColor: "rgba(255,255,255,0.24)" },
  countText: { color: T.color.ink.secondary, fontSize: designTokens.typography.caption.fontSize, fontWeight: "900" },
  countTextActive: { color: T.color.ink.inverse },
});
