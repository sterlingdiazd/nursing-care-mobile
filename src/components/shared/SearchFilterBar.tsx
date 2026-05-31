// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-SHARED-001
// @do-not-edit: false

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobilePrimaryButton, mobileSecondarySurface, mobileTheme } from "@/src/design-system/mobileStyles";
import { hapticFeedback } from "@/src/utils/haptics";
import { designTokens } from "@/src/design-system/tokens";

export interface SearchFilterBarProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (text: string) => void;
  onSearch: () => void;
  onClear: () => void;
  filters?: ReactNode;
}

export default function SearchFilterBar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onSearch,
  onClear,
  filters,
}: SearchFilterBarProps) {
  const handleSearch = () => {
    hapticFeedback.selection();
    onSearch();
  };

  const handleClear = () => {
    hapticFeedback.selection();
    onClear();
  };

  return (
    <View style={styles.container} testID="search-filter-bar" nativeID="search-filter-bar">
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={searchPlaceholder}
          placeholderTextColor={mobileTheme.colors.ink.muted}
          value={searchValue}
          onChangeText={onSearchChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          testID="search-filter-bar-input"
          nativeID="search-filter-bar-input"
        />
        {searchValue.length > 0 && (
          <Pressable
            style={styles.clearButton}
            onPress={handleClear}
            testID="search-filter-bar-clear"
            nativeID="search-filter-bar-clear"
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.searchButton}
          onPress={handleSearch}
          testID="search-filter-bar-search"
          nativeID="search-filter-bar-search"
          accessibilityRole="button"
          accessibilityLabel="Buscar"
        >
          <Text style={styles.searchButtonText}>Buscar</Text>
        </Pressable>
      </View>
      {filters && <View style={styles.filtersRow}>{filters}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileTheme.colors.surface.primary,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    borderRadius: mobileTheme.radius.xl,
    padding: mobileTheme.spacing.lg,
    marginBottom: mobileTheme.spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  input: {
    flex: 1,
    ...mobileSecondarySurface,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    color: mobileTheme.colors.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
  },
  clearButton: {
    backgroundColor: mobileTheme.colors.surface.tertiary,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
  },
  clearButtonText: {
    color: mobileTheme.colors.ink.secondary,
    fontWeight: "700",
    fontSize: designTokens.typography.label.fontSize,
  },
  searchButton: {
    ...mobilePrimaryButton,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
  },
  searchButtonText: {
    color: mobileTheme.colors.ink.inverse,
    fontWeight: "700",
    fontSize: designTokens.typography.body.fontSize,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
    marginTop: designTokens.spacing.md,
  },
});
