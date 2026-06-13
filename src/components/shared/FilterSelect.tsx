import { Fragment, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SelectRow, PickerSheet } from "@/components/payroll/FormModalScaffold";
import { designTokens } from "@/src/design-system/tokens";
import { hapticFeedback } from "@/src/utils/haptics";

export interface FilterSelectOption<K extends string = string> {
  key: K;
  label: string;
  /** Optional count badge (e.g. work-pending counts from the paginated response). */
  count?: number;
  /** Soft status colors {bg,fg}; the whole option row is tinted so the color reads clearly. */
  tint?: { bg: string; fg: string } | null;
  /** Optional section header; consecutive options sharing a group render under one heading. */
  group?: string;
}

interface FilterSelectProps<K extends string> {
  options: ReadonlyArray<FilterSelectOption<K>>;
  value: K;
  onChange: (key: K) => void;
  /** Heading shown above the row and as the sheet title (e.g. "Estado"). */
  label: string;
  placeholder?: string;
  /** Prefix for testIDs: `${prefix}-select` on the row, `${prefix}-${key}` per option. */
  testIDPrefix?: string;
}

/**
 * Compact filter control: a single SelectRow that opens a PickerSheet of options —
 * the same pattern as "Tipo de reporte". Replaces wrapping chip clusters that take
 * several rows. Each option row is tinted with its status color (full width, uniform —
 * not a ragged word-pill or a tiny dot) and options can be grouped into labeled sections.
 */
export function FilterSelect<K extends string>({
  options,
  value,
  onChange,
  label,
  placeholder = "Seleccionar",
  testIDPrefix,
}: FilterSelectProps<K>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value) ?? null;

  const handlePick = (key: K) => {
    hapticFeedback.selection();
    onChange(key);
    setOpen(false);
  };

  let lastGroup: string | undefined;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{label}</Text>
      <SelectRow
        icon="filter"
        value={selected?.label ?? null}
        placeholder={placeholder}
        onPress={() => setOpen(true)}
        testID={testIDPrefix ? `${testIDPrefix}-select` : undefined}
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
      />

      <PickerSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((opt) => {
          const isSelected = opt.key === value;
          const id = testIDPrefix ? `${testIDPrefix}-${String(opt.key).toLowerCase()}` : undefined;
          const showHeader = opt.group && opt.group !== lastGroup;
          lastGroup = opt.group;
          const fg = opt.tint?.fg ?? designTokens.color.ink.primary;
          return (
            <Fragment key={opt.key}>
              {showHeader ? <Text style={styles.groupHeader}>{opt.group}</Text> : null}
              <Pressable
                style={[
                  styles.option,
                  opt.tint ? { backgroundColor: opt.tint.bg } : styles.optionPlain,
                  isSelected && { borderColor: fg },
                ]}
                onPress={() => handlePick(opt.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Filtro ${opt.label}`}
                testID={id}
                nativeID={id}
              >
                <Text style={[styles.optionLabel, { color: fg }]}>{opt.label}</Text>
                <View style={styles.optionRight}>
                  {typeof opt.count === "number" ? (
                    <View style={[styles.count, { backgroundColor: opt.tint ? "rgba(255,255,255,0.55)" : designTokens.color.surface.secondary }]}>
                      <Text style={[styles.countText, { color: fg }]}>{opt.count}</Text>
                    </View>
                  ) : null}
                  {isSelected ? <Text style={[styles.check, { color: fg }]}>✓</Text> : null}
                </View>
              </Pressable>
            </Fragment>
          );
        })}
      </PickerSheet>
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  wrap: { gap: T.spacing.xs },
  heading: { ...T.typography.eyebrow, color: T.color.ink.muted },
  groupHeader: {
    ...T.typography.eyebrow,
    color: T.color.ink.muted,
    marginTop: T.spacing.md,
    marginBottom: T.spacing.xs,
    paddingHorizontal: T.spacing.xs,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: T.spacing.md,
    paddingVertical: 13,
    paddingHorizontal: T.spacing.lg,
    borderRadius: T.radius.lg,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: T.spacing.sm,
  },
  optionPlain: { backgroundColor: T.color.surface.secondary },
  optionLabel: { ...T.typography.body, fontWeight: "800" },
  optionRight: { flexDirection: "row", alignItems: "center", gap: T.spacing.sm },
  count: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: T.radius.pill,
    alignItems: "center",
  },
  countText: { fontSize: 12, fontWeight: "900" },
  check: { fontSize: 16, fontWeight: "900" },
});
