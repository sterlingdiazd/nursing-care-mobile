import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, router } from "expo-router";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";

interface MobileWorkspaceShellProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

interface NavigationItem {
  label: string;
  path: string;
  description: string;
  hideWhenAuthenticated?: boolean;
  hideWhenAnonymous?: boolean;
}

const navigationItems: NavigationItem[] = [
  { label: "Resumen", path: "/", description: "Pantalla principal" },
  {
    label: "Solicitudes",
    path: "/care-requests",
    description: "Cola y revision",
    hideWhenAnonymous: true,
  },
  {
    label: "Nueva solicitud",
    path: "/create-care-request",
    description: "Captura guiada",
    hideWhenAnonymous: true,
  },
  { label: "Cuenta", path: "/account", description: "Sesion y acceso" },
  { label: "Diagnostico", path: "/diagnostics", description: "Backend y logs" },
  { label: "Herramientas", path: "/tools", description: "Utilidades avanzadas" },
  {
    label: "Iniciar sesion",
    path: "/login",
    description: "Acceso manual",
    hideWhenAuthenticated: true,
  },
  {
    label: "Registrar",
    path: "/register",
    description: "Crear cuenta",
    hideWhenAuthenticated: true,
  },
];

function getActivePath(pathname: string) {
  if (pathname.startsWith("/care-requests")) {
    return "/care-requests";
  }

  return pathname;
}

function isOperationalPath(pathname: string) {
  return pathname === "/care-requests"
    || pathname.startsWith("/care-requests/")
    || pathname === "/create-care-request";
}

export default function MobileWorkspaceShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: MobileWorkspaceShellProps) {
  const pathname = usePathname();
  const {
    email,
    isAuthenticated,
    isReady,
    logout,
    roles,
    requiresProfileCompletion,
    requiresAdminReview,
    profileType,
  } = useAuth();
  const { width } = useWindowDimensions();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const activePath = getActivePath(pathname);
  const operationalPath = isOperationalPath(pathname);
  const isWideLayout = hasMounted && width >= 1024;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (requiresProfileCompletion && pathname !== "/register") {
      router.replace("/register");
    }
  }, [pathname, requiresProfileCompletion]);

  useEffect(() => {
    if (isReady && operationalPath && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isReady, operationalPath]);

  useEffect(() => {
    if (requiresAdminReview && profileType === 1 && operationalPath) {
      router.replace("/");
    }
  }, [operationalPath, profileType, requiresAdminReview]);

  useEffect(() => {
    if (
      isReady
      && pathname === "/create-care-request"
      && isAuthenticated
      && !roles.includes("Client")
      && !roles.includes("Admin")
    ) {
      router.replace("/care-requests");
    }
  }, [isAuthenticated, isReady, pathname, roles]);

  const isNurseUnderReview = requiresAdminReview && profileType === 1;
  const visibleItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        if (item.hideWhenAuthenticated && isAuthenticated) {
          return false;
        }

        if (item.hideWhenAnonymous && !isAuthenticated) {
          return false;
        }

        if (isNurseUnderReview && item.path !== "/" && item.path !== "/account") {
          return false;
        }

        if (item.path === "/create-care-request" && !roles.includes("Client") && !roles.includes("Admin")) {
          return false;
        }

        return true;
      }),
    [isAuthenticated, isNurseUnderReview, roles],
  );

  if (
    (requiresProfileCompletion && pathname !== "/register")
    || (isReady && operationalPath && !isAuthenticated)
    || (isNurseUnderReview && operationalPath)
    || (
      isReady
      && pathname === "/create-care-request"
      && isAuthenticated
      && !roles.includes("Client")
      && !roles.includes("Admin")
    )
  ) {
    return null;
  }

  const currentItem =
    visibleItems.find((item) => item.path === activePath)
    ?? navigationItems.find((item) => item.path === activePath)
    ?? navigationItems[0];

  const navigateTo = (path: string) => {
    setDrawerOpen(false);
    if (path === activePath) {
      return;
    }

    logClientEvent("mobile.ui", "Workspace navigation selected", {
      from: activePath,
      to: path,
    });
    router.push(path as never);
  };

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarEyebrow}>NursingCare</Text>
      <Text style={styles.sidebarTitle}>Consola mobile</Text>
      <Text style={styles.sidebarCopy}>
        Navega entre resumen, solicitudes, cuenta, diagnostico y herramientas desde una sola estructura.
      </Text>

      <View style={styles.navList}>
        {visibleItems.map((item) => {
          const active = item.path === activePath;

          return (
            <Pressable
              key={item.path}
              onPress={() => navigateTo(item.path)}
              style={({ pressed }) => [
                styles.navButton,
                active && styles.navButtonActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.navButtonLabel, active && styles.navButtonLabelActive]}>
                {item.label}
              </Text>
              <Text style={[styles.navButtonMeta, active && styles.navButtonMetaActive]}>
                {item.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sidebarFooter}>
        <Text style={styles.sidebarMetaLabel}>Sesion actual</Text>
        <Text style={styles.sidebarMetaValue}>{email ?? "Sin correo cargado"}</Text>
        <Text style={styles.sidebarMetaCopy}>
          {roles.length > 0 ? roles.join(", ") : "Sin roles cargados"}
        </Text>

        {isAuthenticated && (
          <Pressable
            onPress={() => {
              logClientEvent("mobile.ui", "Sidebar logout tapped");
              void logout();
              setDrawerOpen(false);
              router.replace("/");
            }}
            style={({ pressed }) => [
              styles.sidebarLogoutButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.sidebarLogoutButtonText}>Cerrar sesion</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {!isWideLayout && (
        <Modal
          visible={drawerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDrawerOpen(false)}
        >
          <View style={styles.drawerOverlay}>
            <Pressable style={styles.drawerScrim} onPress={() => setDrawerOpen(false)} />
            <View style={styles.drawerPanel}>{renderSidebar()}</View>
          </View>
        </Modal>
      )}

      <View style={styles.screen}>
        {isWideLayout && <View style={styles.sidebarHost}>{renderSidebar()}</View>}

        <KeyboardAvoidingView
          style={styles.main}
          behavior={isWideLayout ? undefined : "padding"}
          keyboardVerticalOffset={isWideLayout ? 0 : 88}
        >
          <View style={styles.topBar}>
            {!isWideLayout && (
              <Pressable
                onPress={() => setDrawerOpen(true)}
                style={({ pressed }) => [
                  styles.menuButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.menuButtonText}>Menu</Text>
              </Pressable>
            )}

            <View style={styles.topBarText}>
              <Text style={styles.topBarLabel}>Seccion activa</Text>
              <Text style={styles.topBarTitle}>{currentItem.label}</Text>
            </View>

            <View style={styles.topBarChip}>
              <Text style={styles.topBarChipText}>{isAuthenticated ? "Sesion activa" : "Sesion requerida"}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>

              {actions && <View style={styles.actions}>{actions}</View>}
            </View>

            <View style={styles.body}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef3fb",
  },
  screen: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#eef3fb",
  },
  sidebarHost: {
    width: 320,
    padding: 18,
    paddingRight: 0,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
  drawerScrim: {
    flex: 1,
  },
  drawerPanel: {
    width: 318,
    padding: 18,
  },
  sidebar: {
    flex: 1,
    backgroundColor: "#123047",
    borderRadius: 30,
    padding: 22,
  },
  sidebarEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "rgba(214, 234, 248, 0.72)",
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#fffef8",
    marginBottom: 12,
  },
  sidebarCopy: {
    color: "rgba(232, 241, 247, 0.78)",
    lineHeight: 22,
    marginBottom: 22,
  },
  navList: {
    gap: 10,
  },
  navButton: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  navButtonActive: {
    backgroundColor: "#f6ead7",
    borderColor: "rgba(246, 234, 215, 0.8)",
  },
  navButtonLabel: {
    color: "#eff6ff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  navButtonLabelActive: {
    color: "#102a43",
  },
  navButtonMeta: {
    color: "rgba(232, 241, 247, 0.66)",
    fontSize: 13,
    lineHeight: 18,
  },
  navButtonMetaActive: {
    color: "#415b75",
  },
  sidebarFooter: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  sidebarMetaLabel: {
    color: "#d8ecec",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sidebarMetaValue: {
    color: "#fffef8",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  sidebarMetaCopy: {
    color: "rgba(232, 241, 247, 0.78)",
    lineHeight: 20,
  },
  sidebarLogoutButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  sidebarLogoutButtonText: {
    color: "#fffef8",
    fontSize: 15,
    fontWeight: "800",
  },
  main: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  topBar: {
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 24,
    backgroundColor: "rgba(255, 253, 248, 0.92)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#123047",
  },
  menuButtonText: {
    color: "#fffef8",
    fontSize: 14,
    fontWeight: "800",
  },
  topBarText: {
    flex: 1,
  },
  topBarLabel: {
    color: "#7f5724",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  topBarTitle: {
    color: "#102a43",
    fontSize: 18,
    fontWeight: "800",
  },
  topBarChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(183, 128, 60, 0.12)",
  },
  topBarChipText: {
    color: "#7f5724",
    fontSize: 12,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
    gap: 18,
  },
  hero: {
    backgroundColor: "#10295f",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#93c5fd",
    marginBottom: 10,
  },
  title: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#dbeafe",
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  body: {
    gap: 18,
  },
  buttonPressed: {
    opacity: 0.92,
  },
});
