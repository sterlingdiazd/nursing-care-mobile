import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { designTokens } from "@/src/design-system/tokens";

/**
 * Visible window of page numbers around the current page. Always shows the
 * first and last page; collapses interior gaps to an ellipsis. Mirrors the
 * care-requests list pager so every paginated list reads the same.
 */
function buildPageDisplay(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | "ellipsis"> = [1];
  if (current > 3) out.push("ellipsis");
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  for (let i = lo; i <= hi; i++) out.push(i);
  if (current < total - 2) out.push("ellipsis");
  out.push(total);
  return out;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  testID?: string;
}

function PaginationComponent({ currentPage, totalPages, onPageChange, testID }: PaginationProps) {
  const display = useMemo(() => buildPageDisplay(currentPage, totalPages), [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  const go = (n: number) => onPageChange(Math.min(Math.max(1, n), totalPages));

  return (
    <View style={styles.paginationBar} testID={testID} nativeID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Página anterior"
        onPress={() => go(currentPage - 1)}
        disabled={currentPage <= 1}
        style={({ pressed }) => [
          styles.pageNav,
          currentPage <= 1 && styles.disabled,
          pressed && currentPage > 1 && styles.buttonPressed,
        ]}
      >
        <Text style={styles.pageNavGlyph}>‹</Text>
      </Pressable>

      {display.map((entry, idx) => {
        if (entry === "ellipsis") {
          return (
            <Text key={`e-${idx}`} style={styles.pageEllipsis}>
              …
            </Text>
          );
        }
        const active = entry === currentPage;
        return (
          <Pressable
            key={entry}
            accessibilityRole="button"
            accessibilityLabel={`Página ${entry}`}
            accessibilityState={{ selected: active }}
            onPress={() => go(entry)}
            style={({ pressed }) => [
              styles.pageChip,
              active && styles.pageChipActive,
              pressed && !active && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.pageChipText, active && styles.pageChipTextActive]}>{entry}</Text>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Página siguiente"
        onPress={() => go(currentPage + 1)}
        disabled={currentPage >= totalPages}
        style={({ pressed }) => [
          styles.pageNav,
          currentPage >= totalPages && styles.disabled,
          pressed && currentPage < totalPages && styles.buttonPressed,
        ]}
      >
        <Text style={styles.pageNavGlyph}>›</Text>
      </Pressable>
    </View>
  );
}

export const Pagination = memo(PaginationComponent);

const styles = StyleSheet.create({
  paginationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageNav: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pageNavGlyph: {
    color: designTokens.color.ink.primary,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "800",
  },
  pageChip: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pageChipActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.ink.accent,
  },
  pageChipText: { color: designTokens.color.ink.primary, fontSize: 13, fontWeight: "800" },
  pageChipTextActive: { color: designTokens.color.ink.inverse },
  pageEllipsis: { color: designTokens.color.ink.muted, fontSize: 16, fontWeight: "900", paddingHorizontal: 4 },
  buttonPressed: { opacity: 0.78 },
  disabled: { opacity: 0.35 },
});
