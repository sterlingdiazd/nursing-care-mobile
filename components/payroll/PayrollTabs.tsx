import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";

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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#1976d2",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#1976d2",
    fontWeight: "600",
  },
});