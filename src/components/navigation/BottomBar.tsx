import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, usePathname } from "expo-router";

import { useAuth, UserProfileType } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";
import { hapticFeedback } from "@/src/utils/haptics";

interface TabConfig {
  key: string;
  label: string;
  icon: string;
  route: string;
  /** Active when pathname starts with one of these prefixes (longest match wins). */
  activeMatchers: ReadonlyArray<string>;
  visibleTo: ReadonlyArray<UserProfileType>;
}

const TAB_HEIGHT = 56;

// Single source of truth for bottom-bar navigation. Each tap is a stack
// navigation via router.replace — no per-tab state, no preserved sub-routes.
// Tapping a tab always lands on its index route. Back is linear.
const TABS: ReadonlyArray<TabConfig> = [
  {
    key: "index",
    label: "Inicio",
    icon: "home",
    route: "/",
    activeMatchers: ["/"],
    visibleTo: [UserProfileType.ADMIN, UserProfileType.NURSE, UserProfileType.CLIENT],
  },
  {
    key: "care-requests",
    label: "Solicitudes",
    icon: "list",
    route: "/care-requests",
    activeMatchers: ["/care-requests", "/admin/care-requests"],
    visibleTo: [UserProfileType.ADMIN, UserProfileType.NURSE, UserProfileType.CLIENT],
  },
  {
    key: "nurse/payroll",
    label: "Nómina",
    icon: "money",
    route: "/nurse/payroll",
    activeMatchers: ["/nurse/payroll"],
    visibleTo: [UserProfileType.NURSE],
  },
  {
    key: "admin/payroll",
    label: "Nómina",
    icon: "money",
    route: "/admin/payroll",
    activeMatchers: ["/admin/payroll"],
    visibleTo: [UserProfileType.ADMIN],
  },
  {
    key: "account",
    label: "Cuenta",
    icon: "user",
    route: "/account",
    activeMatchers: ["/account"],
    visibleTo: [UserProfileType.CLIENT],
  },
  {
    // A nurse's "Cuenta" lands on her profile (identity + contact + payout
    // account + session/logout), not the generic /account screen.
    key: "nurse-account",
    label: "Cuenta",
    icon: "user",
    route: "/nurse/profile",
    activeMatchers: ["/nurse/profile"],
    visibleTo: [UserProfileType.NURSE],
  },
  {
    key: "admin",
    label: "Menú",
    icon: "th-large",
    route: "/admin",
    activeMatchers: ["/admin"],
    visibleTo: [UserProfileType.ADMIN],
  },
];

function isActive(tab: TabConfig, pathname: string): { match: boolean; specificity: number } {
  // Exact match wins; otherwise longest prefix among activeMatchers.
  let best = -1;
  for (const m of tab.activeMatchers) {
    if (pathname === m) return { match: true, specificity: m.length + 100 };
    if (m === "/" && pathname === "/") return { match: true, specificity: 1 };
    if (m !== "/" && pathname.startsWith(m + "/")) {
      best = Math.max(best, m.length);
    }
    if (m !== "/" && pathname === m) {
      best = Math.max(best, m.length + 100);
    }
  }
  return { match: best >= 0, specificity: best };
}

export default function BottomBar() {
  const insets = useSafeAreaInsets();
  const { profileType, isAuthenticated, isReady, requiresAdminReview } = useAuth();
  const pathname = usePathname();

  if (!isReady || !isAuthenticated) return null;
  if (requiresAdminReview) return null;

  const effective = profileType ?? UserProfileType.CLIENT;
  const visible = TABS.filter((t) => t.visibleTo.includes(effective));

  // Pick the most-specific match across visible tabs so /admin/care-requests
  // highlights "Solicitudes", not "Menú".
  let activeKey: string | null = null;
  let bestSpec = -1;
  for (const t of visible) {
    const { match, specificity } = isActive(t, pathname);
    if (match && specificity > bestSpec) {
      activeKey = t.key;
      bestSpec = specificity;
    }
  }

  const handlePress = (tab: TabConfig) => {
    hapticFeedback.selection();
    if (tab.route === pathname) return;
    router.replace(tab.route as never);
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
      {visible.map((tab) => {
        const active = activeKey === tab.key;
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
            onPress={() => handlePress(tab)}
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
