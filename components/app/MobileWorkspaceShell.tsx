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
import { BlurView } from "expo-blur";
import { hapticFeedback } from "@/src/utils/haptics";
import { mobileSecondaryButton, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";

import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import {
  canAccessAccount,
  canAccessAdminPortal,
  canAccessCareRequests,
  canAccessSupportTools,
  canCreateCareRequests,
} from "@/src/utils/authRedirect";
import { formatRoleLabels } from "@/src/utils/roleLabels";

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
  access?: "admin" | "careRequests" | "createCareRequest" | "account" | "support";
}

const navigationItems: NavigationItem[] = [
  { label: "Resumen", path: "/", description: "Pantalla principal" },
  {
    label: "Panel admin",
    path: "/admin",
    description: "Resumen ejecutivo",
    hideWhenAnonymous: true,
    access: "admin",
  },
  {
    label: "Enfermeras",
    path: "/admin/nurse-profiles",
    description: "Perfiles y revision",
    hideWhenAnonymous: true,
    access: "admin",
  },
  {
    label: "Usuarios",
    path: "/admin/users",
    description: "Cuentas y roles",
    hideWhenAnonymous: true,
    access: "admin",
  },
  {
    label: "Clientes",
    path: "/admin/clients",
    description: "Cartera de clientes",
    hideWhenAnonymous: true,
    access: "admin",
  },
  {
    label: "Solicitudes admin",
    path: "/admin/care-requests",
    description: "Cola administrativa",
    hideWhenAnonymous: true,
    access: "admin",
  },
  {
    label: "Solicitudes",
    path: "/care-requests",
    description: "Cola y revision",
    hideWhenAnonymous: true,
    access: "careRequests",
  },
  {
    label: "Nueva solicitud",
    path: "/create-care-request",
    description: "Captura guiada",
    hideWhenAnonymous: true,
    access: "createCareRequest",
  },
  { label: "Cuenta", path: "/account", description: "Sesion y acceso", hideWhenAnonymous: true, access: "account" },
  { label: "Diagnostico", path: "/diagnostics", description: "Backend y logs", hideWhenAnonymous: true, access: "support" },
  { label: "Herramientas", path: "/tools", description: "Utilidades avanzadas", hideWhenAnonymous: true, access: "support" },
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
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname.startsWith("/admin/nurse-profiles")) {
      return "/admin/nurse-profiles";
    }

    if (pathname.startsWith("/admin/users")) {
      return "/admin/users";
    }

    if (pathname.startsWith("/admin/clients")) {
      return "/admin/clients";
    }

    if (pathname.startsWith("/admin/care-requests")) {
      return "/admin/care-requests";
    }

    return "/admin";
  }

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
  const accessState = {
    roles,
    requiresProfileCompletion,
    requiresAdminReview,
  };
  const canOpenCareRequests = canAccessCareRequests(accessState);
  const canOpenCreateCareRequest = canCreateCareRequests(accessState);
  const canOpenAdminPortal = canAccessAdminPortal(accessState);
  const canOpenAccount = canAccessAccount(accessState);
  const canOpenSupportTools = canAccessSupportTools(accessState);

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
    if (!canOpenCareRequests && pathname === "/care-requests") {
      router.replace("/");
    }
  }, [canOpenCareRequests, pathname]);

  useEffect(() => {
    if (!canOpenCareRequests && pathname.startsWith("/care-requests/")) {
      router.replace("/");
    }
  }, [canOpenCareRequests, pathname]);

  useEffect(() => {
    if (isReady && pathname === "/create-care-request" && isAuthenticated && !canOpenCreateCareRequest) {
      router.replace(canOpenCareRequests ? "/care-requests" : "/");
    }
  }, [canOpenCareRequests, canOpenCreateCareRequest, isAuthenticated, isReady, pathname]);

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

        if (item.access === "admin" && !canOpenAdminPortal) {
          return false;
        }

        if (item.access === "careRequests" && !canOpenCareRequests) {
          return false;
        }

        if (item.access === "createCareRequest" && !canOpenCreateCareRequest) {
          return false;
        }

        if (item.access === "account" && !canOpenAccount) {
          return false;
        }

        if (item.access === "support" && !canOpenSupportTools) {
          return false;
        }

        if (isNurseUnderReview && item.path !== "/" && item.path !== "/account") {
          return false;
        }

        if (item.path === "/create-care-request" && activePath === "/create-care-request") {
          return false;
        }

        return true;
      }),
    [canOpenAccount, canOpenAdminPortal, canOpenCareRequests, canOpenCreateCareRequest, canOpenSupportTools, isAuthenticated, isNurseUnderReview, activePath],
  );

  if (
    (requiresProfileCompletion && pathname !== "/register")
    || (isReady && operationalPath && !isAuthenticated)
    || (!canOpenCareRequests && pathname.startsWith("/care-requests"))
    || (isReady && pathname === "/create-care-request" && isAuthenticated && !canOpenCreateCareRequest)
  ) {
    return null;
  }

  const currentItem =
    visibleItems.find((item) => item.path === activePath)
    ?? navigationItems.find((item) => item.path === activePath)
    ?? navigationItems[0];

  const navigateTo = (path: string) => {
    hapticFeedback.light();
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
      <Text style={styles.sidebarTitle}>{isAuthenticated ? "Espacio de trabajo" : "Acceso"}</Text>
      <Text style={styles.sidebarCopy}>
        {isAuthenticated
          ? "Accesos principales segun tu perfil."
          : "Entra o crea tu cuenta para continuar."}
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
          {formatRoleLabels(roles)}
        </Text>

        {isAuthenticated && (
          <Pressable
            onPress={() => {
              hapticFeedback.light();
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
            <Pressable style={styles.drawerScrim} onPress={() => {
              hapticFeedback.light();
              setDrawerOpen(false);
            }} />
            <SafeAreaView style={styles.drawerPanel} edges={["left", "bottom", "top"]}>
              {renderSidebar()}
            </SafeAreaView>
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
          <BlurView intensity={80} tint="light" style={styles.topBar}>
            {!isWideLayout && (
              <Pressable
                onPress={() => {
                  hapticFeedback.light();
                  setDrawerOpen(true);
                }}
                style={({ pressed }) => [
                  styles.menuButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.menuButtonText}>Menu</Text>
              </Pressable>
            )}

            <View style={styles.topBarText}>
              <Text style={styles.topBarTitle}>{currentItem.label}</Text>
            </View>

            <View style={styles.topBarChip}>
              <Text style={styles.topBarChipText}>{isAuthenticated ? "Sesion activa" : "Invitado"}</Text>
            </View>
          </BlurView>

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
    backgroundColor: mobileTheme.colors.surface.canvas,
  },
  screen: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: mobileTheme.colors.surface.canvas,
  },
  sidebarHost: {
    width: 320,
    padding: 18,
    paddingRight: 0,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.16)",
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
    ...mobileSurfaceCard,
    borderRadius: mobileTheme.radius.xl,
    padding: 22,
  },
  sidebarEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  sidebarCopy: {
    color: "#4b5563",
    lineHeight: 22,
    marginBottom: 22,
  },
  navList: {
    gap: 10,
  },
  navButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  navButtonActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  navButtonLabel: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  navButtonLabelActive: {
    color: "#007aff",
  },
  navButtonMeta: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
  },
  navButtonMetaActive: {
    color: "#4b5563",
  },
  sidebarFooter: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sidebarMetaLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sidebarMetaValue: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  sidebarMetaCopy: {
    color: "#4b5563",
    lineHeight: 20,
  },
  sidebarLogoutButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  sidebarLogoutButtonText: {
    color: "#007aff",
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
    borderRadius: 22,
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  menuButton: {
    ...mobileSecondaryButton,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuButtonText: {
    color: "#007aff",
    fontSize: 14,
    fontWeight: "800",
  },
  topBarText: {
    flex: 1,
  },
  topBarTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  topBarChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#eff6ff",
  },
  topBarChipText: {
    color: "#007aff",
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
    ...mobileSurfaceCard,
    borderRadius: mobileTheme.radius.xl,
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#4b5563",
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  body: {
    gap: 18,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
