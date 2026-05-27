import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import type { PaletteHue } from "@/src/design-system/tokens";
import { ModuleTile } from "@/src/components/shared/ModuleTile";
import { navigationTestIds, adminTestIds } from "@/src/testing/testIds";
import { automationProps } from "@/src/utils/adminOperationalUx";
import { hapticFeedback } from "@/src/utils/haptics";

type MenuItem = {
  key: string;
  label: string;
  path: string;
  icon: ComponentProps<typeof FontAwesome>["name"];
  hue: PaletteHue;
};

// Per-module semantic colors: people read cool (blue/teal/purple), services mix
// operational hues, money is green/teal, alerts are red, system config is muted.
const menuGroups: Array<{ title: string; items: MenuItem[] }> = [
  {
    title: "Personas",
    items: [
      { key: "users", label: "Usuarios", path: "/admin/users", icon: "users", hue: "blue" },
      { key: "clients", label: "Clientes", path: "/admin/clients", icon: "address-book", hue: "teal" },
      { key: "nurses", label: "Enfermeras", path: "/admin/nurse-profiles", icon: "user-md", hue: "purple" },
    ],
  },
  {
    title: "Servicios",
    items: [
      { key: "requests", label: "Solicitudes", path: "/admin/care-requests", icon: "list", hue: "indigo" },
      { key: "shifts", label: "Calendario", path: "/admin/shifts", icon: "calendar", hue: "orange" },
      { key: "actions", label: "Acciones", path: "/admin/action-items", icon: "check-square-o", hue: "green" },
    ],
  },
  {
    title: "Operación",
    items: [
      { key: "finance", label: "Finanzas", path: "/admin/finance", icon: "line-chart", hue: "green" },
      { key: "payroll", label: "Nómina", path: "/admin/payroll", icon: "money", hue: "teal" },
      { key: "reports", label: "Reportes", path: "/admin/reports", icon: "bar-chart", hue: "purple" },
      { key: "audit", label: "Auditoría", path: "/admin/audit-logs", icon: "history", hue: "neutral" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { key: "catalog", label: "Catálogo", path: "/admin/catalog", icon: "book", hue: "amber" },
      { key: "settings", label: "Ajustes", path: "/admin/settings", icon: "cog", hue: "neutral" },
      { key: "notifications", label: "Notificaciones", path: "/admin/notifications", icon: "bell", hue: "red" },
    ],
  },
];

function deriveInitials(email: string | null): string {
  if (!email) return "?";
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return email.slice(0, 1).toUpperCase();
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || cleaned.slice(0, 1).toUpperCase();
}

function deriveDisplayName(email: string | null): string {
  if (!email) return "Sin nombre";
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return email;
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function primaryRoleLabel(roles: string[]): string {
  if (roles.includes("ADMIN")) return "Administrador";
  if (roles.includes("NURSE")) return "Enfermera";
  if (roles.includes("CLIENT")) return "Cliente";
  return roles[0] ?? "Usuario";
}

export default function AdminMenuTab() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles, email, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login" as any);
      return;
    }
    if (requiresProfileCompletion) {
      router.replace("/register" as any);
      return;
    }
    if (!roles.includes("ADMIN")) {
      router.replace("/" as any);
    }
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const handleEditProfile = () => {
    hapticFeedback.selection();
    router.push("/admin/profile" as any);
  };

  const performLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login" as any);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutPress = () => {
    if (isLoggingOut) return;
    hapticFeedback.selection();
    if (Platform.OS === "web") {
      // Alert.alert is unreliable on web; just confirm via window.confirm.
      const confirmed = typeof window !== "undefined" && typeof window.confirm === "function"
        ? window.confirm("¿Cerrar sesión en este dispositivo?")
        : true;
      if (confirmed) void performLogout();
      return;
    }
    Alert.alert(
      "Cerrar sesión",
      "¿Cerrar sesión en este dispositivo?",
      [
        {
          text: "Cancelar",
          style: "cancel",
          ...automationProps(adminTestIds.menu.logoutCancelButton),
        },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => void performLogout(),
          ...automationProps(adminTestIds.menu.logoutConfirmButton),
        },
      ],
      { cancelable: true },
    );
  };

  const initials = deriveInitials(email);
  const displayName = deriveDisplayName(email);
  const roleLabel = primaryRoleLabel(roles);

  return (
    <View
      testID={navigationTestIds.screens.adminHomeRoot}
      nativeID={navigationTestIds.screens.adminHomeRoot}
      style={styles.root}
    >
      <MobileWorkspaceShell title="Menú">
        <View {...automationProps(adminTestIds.menu.screen)} style={styles.screen}>
          <Pressable
            {...automationProps(adminTestIds.menu.profileCard)}
            accessibilityRole="button"
            accessibilityLabel={`Perfil de ${displayName}. Tocar para editar.`}
            onPress={handleEditProfile}
            style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileTextWrap}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email ?? ""}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            </View>
            <View
              {...automationProps(adminTestIds.menu.profileEditButton)}
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={styles.editIconButton}
            >
              <FontAwesome name="pencil" size={18} color={mobileTheme.colors.ink.accent} />
            </View>
          </Pressable>

          {menuGroups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.grid}>
                {group.items.map((item) => (
                  <ModuleTile
                    key={item.key}
                    icon={item.icon}
                    hue={item.hue}
                    label={item.label}
                    testID={adminTestIds.menu.item(item.key)}
                    onPress={() => {
                      hapticFeedback.selection();
                      router.push(item.path as any);
                    }}
                  />
                ))}
              </View>
            </View>
          ))}

          <Pressable
            {...automationProps(adminTestIds.menu.logoutButton)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={handleLogoutPress}
            disabled={isLoggingOut}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed, isLoggingOut && styles.disabled]}
          >
            <FontAwesome name="sign-out" size={18} color={mobileTheme.colors.ink.danger} />
            <Text style={styles.logoutText}>{isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</Text>
          </Pressable>
        </View>
      </MobileWorkspaceShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    gap: 18,
    paddingBottom: 8,
  },
  profileCard: {
    ...mobileSurfaceCard,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.colors.surface.secondary,
  },
  avatarText: {
    color: mobileTheme.colors.ink.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  profileTextWrap: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 16,
    fontWeight: "900",
  },
  profileEmail: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    fontWeight: "500",
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: mobileTheme.colors.surface.secondary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  roleBadgeText: {
    color: mobileTheme.colors.ink.accent,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.colors.surface.secondary,
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 16,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pressed: {
    opacity: 0.78,
  },
  logoutButton: {
    ...mobileSurfaceCard,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    marginTop: 4,
  },
  logoutText: {
    color: mobileTheme.colors.ink.danger,
    fontSize: 15,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.6,
  },
});
