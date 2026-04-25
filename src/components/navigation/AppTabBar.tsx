import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";

import { useAuth, UserProfileType } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";

interface TabConfig {
  key: string;
  label: string;
  icon: string;
  visibleTo: UserProfileType[];
}

const TAB_HEIGHT = 56;

const TAB_CONFIG: TabConfig[] = [
  { key: "index", label: "Inicio", icon: "home", visibleTo: [UserProfileType.ADMIN, UserProfileType.NURSE, UserProfileType.CLIENT] },
  { key: "care-requests", label: "Solicitudes", icon: "list", visibleTo: [UserProfileType.ADMIN, UserProfileType.NURSE, UserProfileType.CLIENT] },
  { key: "nurse/payroll", label: "Nomina", icon: "money", visibleTo: [UserProfileType.NURSE] },
  { key: "admin/payroll", label: "Nomina", icon: "money", visibleTo: [UserProfileType.ADMIN] },
  { key: "account", label: "Cuenta", icon: "user", visibleTo: [UserProfileType.CLIENT, UserProfileType.NURSE] },
  { key: "account", label: "Admin", icon: "cog", visibleTo: [UserProfileType.ADMIN] },
];

export default function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { profileType } = useAuth();

  const visibleTabs = TAB_CONFIG.filter(
    (tab) => profileType !== null && tab.visibleTo.includes(profileType),
  );

  const getRouteKey = (tabKey: string) => {
    if (tabKey === "nurse/payroll") return "nurse";
    if (tabKey === "admin/payroll") return "admin";
    return tabKey;
  };

  const isActive = (tabKey: string) => {
    const routeName = state.routes[state.index]?.name ?? "";
    const routeKey = getRouteKey(tabKey);
    return routeName === routeKey || routeName.startsWith(routeKey);
  };

  const handlePress = (tabKey: string) => {
    const routeKey = getRouteKey(tabKey);
    const route = state.routes.find((r) => r.name === routeKey);
    if (!route) return;

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (event.defaultPrevented) return;

    if (tabKey === "nurse/payroll") {
      router.push("/nurse/payroll" as any);
    } else if (tabKey === "admin/payroll") {
      router.push("/admin/payroll" as any);
    } else {
      navigation.navigate(routeKey);
    }
  };

  return (
    <View
      testID={navigationTestIds.tabBar.root}
      nativeID={navigationTestIds.tabBar.root}
      style={[
        styles.container,
        { paddingBottom: insets.bottom, height: TAB_HEIGHT + insets.bottom },
      ]}
    >
      {visibleTabs.map((tab) => {
        const active = isActive(tab.key);
        const color = active
          ? designTokens.color.ink.accent
          : designTokens.color.ink.muted;

        return (
          <Pressable
            key={tab.key}
            testID={navigationTestIds.tabBar.btn(tab.key)}
            nativeID={navigationTestIds.tabBar.btn(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            onPress={() => handlePress(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed,
            ]}
          >
            <FontAwesome
              testID={navigationTestIds.tabBar.icon(tab.key)}
              nativeID={navigationTestIds.tabBar.icon(tab.key)}
              name={tab.icon as any}
              size={22}
              color={color}
            />
            <Text
              testID={navigationTestIds.tabBar.label(tab.key)}
              nativeID={navigationTestIds.tabBar.label(tab.key)}
              style={[styles.label, { color }]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: designTokens.color.surface.primary,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    gap: 3,
  },
  tabPressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
});
