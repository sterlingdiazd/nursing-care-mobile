import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

interface PayrollTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function PayrollTabs({ activeTab, onTabChange }: PayrollTabsProps) {
  const tabs = [
    { key: "periods", label: "Períodos" },
    { key: "rules", label: "Reglas" },
    { key: "deductions", label: "Deducciones" },
    { key: "adjustments", label: "Ajustes" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab,
            ]}
            onPress={() => onTabChange(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.color.ink.inverse,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginHorizontal: 2,
    flexShrink: 1,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: designTokens.color.ink.accentStrong,
  },
  tabText: {
    fontSize: 14,
    color: designTokens.color.ink.muted,
  },
  activeTabText: {
    color: designTokens.color.ink.accentStrong,
    fontWeight: "600",
  },
});
