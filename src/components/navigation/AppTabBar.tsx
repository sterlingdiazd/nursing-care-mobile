import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { useAuth, UserProfileType } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";
import { hapticFeedback } from "@/src/utils/haptics";

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
  { key: "nurse/payroll", label: "Nómina", icon: "money", visibleTo: [UserProfileType.NURSE] },
  { key: "admin/payroll", label: "Nómina", icon: "money", visibleTo: [UserProfileType.ADMIN] },
  { key: "account", label: "Cuenta", icon: "user", visibleTo: [UserProfileType.CLIENT, UserProfileType.NURSE] },
  { key: "admin", label: "Menú", icon: "th-large", visibleTo: [UserProfileType.ADMIN] },
];

export default function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { profileType } = useAuth();

  const effectiveProfileType = profileType ?? UserProfileType.CLIENT;
  const visibleTabs = TAB_CONFIG.filter((tab) => tab.visibleTo.includes(effectiveProfileType));

  const getRouteKey = (tabKey: string) => {
    if (tabKey === "nurse/payroll") return "nurse";
    if (tabKey === "admin/payroll") return "admin";
    return tabKey;
  };

  const getNestedRouteName = (): string | undefined => {
    const current = state.routes[state.index];
    const nested = (current as any)?.state;
    if (!nested) return undefined;
    return nested.routes?.[nested.index ?? 0]?.name;
  };

  const isActive = (tabKey: string) => {
    const routeName = state.routes[state.index]?.name ?? "";
    const routeKey = getRouteKey(tabKey);
    if (tabKey.includes("/")) {
      const [, nestedExpected] = tabKey.split("/");
      return routeName === routeKey && getNestedRouteName() === nestedExpected;
    }
    if (routeName !== routeKey) return false;
    const nestedName = getNestedRouteName();
    if (!nestedName || nestedName === "index") return true;
    const collidingNestedKeys = TAB_CONFIG
      .filter((t) => t.key.startsWith(`${routeKey}/`))
      .map((t) => t.key.split("/")[1]);
    return !collidingNestedKeys.includes(nestedName);
  };

  const handlePress = (tabKey: string) => {
    hapticFeedback.selection();
    const routeKey = getRouteKey(tabKey);
    const route = state.routes.find((r) => r.name === routeKey);
    if (!route) return;

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      if (tabKey.includes("/")) {
        const [, nestedRoute] = tabKey.split("/");
        navigation.navigate(routeKey, { screen: nestedRoute } as never);
        return;
      }

      // Tapping a top-level tab is a "take me to the top of this tab" action,
      // not "resume the last sub-route I visited inside it." Without forcing
      // `screen: "index"`, React Navigation preserves the tab's previous nested
      // state — so tapping Menú from inside /admin/care-requests would land
      // back on /admin/care-requests instead of the menu landing page.
      navigation.navigate(routeKey, { screen: "index" } as never);
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
    paddingTop: designTokens.spacing.sm,
    gap: designTokens.spacing.xs,
  },
  tabPressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "600",
    marginTop: designTokens.spacing.xs,
  },
});
