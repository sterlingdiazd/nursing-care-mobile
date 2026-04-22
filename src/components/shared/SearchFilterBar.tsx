// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-SHARED-001
// @do-not-edit: false

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobilePrimaryButton, mobileSecondarySurface, mobileTheme } from "@/src/design-system/mobileStyles";

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
  return (
    <View style={styles.container} testID="search-filter-bar" nativeID="search-filter-bar">
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={searchPlaceholder}
          placeholderTextColor="#9ca3af"
          value={searchValue}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          testID="search-filter-bar-input"
          nativeID="search-filter-bar-input"
        />
        {searchValue.length > 0 && (
          <Pressable
            style={styles.clearButton}
            onPress={onClear}
            testID="search-filter-bar-clear"
            nativeID="search-filter-bar-clear"
          >
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.searchButton}
          onPress={onSearch}
          testID="search-filter-bar-search"
          nativeID="search-filter-bar-search"
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: mobileTheme.colors.ink.primary,
    fontSize: 15,
  },
  clearButton: {
    backgroundColor: mobileTheme.colors.surface.tertiary,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearButtonText: {
    color: mobileTheme.colors.ink.secondary,
    fontWeight: "700",
    fontSize: 13,
  },
  searchButton: {
    ...mobilePrimaryButton,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchButtonText: {
    color: mobileTheme.colors.ink.inverse,
    fontWeight: "700",
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
    marginTop: 10,
  },
});
