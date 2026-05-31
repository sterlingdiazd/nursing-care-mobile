// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-SHARED-001
// @do-not-edit: false

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobilePrimaryButton, mobileSecondarySurface } from "@/src/design-system/mobileStyles";
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
          placeholderTextColor={designTokens.color.ink.muted}
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
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.xl,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm,
  },
  input: {
    flex: 1,
    ...mobileSecondarySurface,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
  },
  clearButton: {
    backgroundColor: designTokens.color.surface.tertiary,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
  },
  clearButtonText: {
    color: designTokens.color.ink.secondary,
    fontWeight: "700",
    fontSize: designTokens.typography.label.fontSize,
  },
  searchButton: {
    ...mobilePrimaryButton,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
  },
  searchButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "700",
    fontSize: designTokens.typography.body.fontSize,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.md,
  },
});
