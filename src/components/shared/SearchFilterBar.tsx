// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-SHARED-001
// @do-not-edit: false

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
            <Text style={styles.clearButtonText}>✕</Text>
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
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#111827",
    fontSize: 15,
  },
  clearButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  clearButtonText: {
    color: "#6b7280",
    fontWeight: "700",
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: "#007aff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
});
