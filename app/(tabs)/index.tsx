import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { designTokens, type PaletteHue } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { IconBadge } from "@/src/components/shared/IconBadge";
import AdminDashboardScreen from "@/src/screens/AdminDashboardScreen";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import {
  canAccessAdminPortal,
  canAccessCareRequests,
  canAccessSupportTools,
  canCreateCareRequests,
} from "@/src/utils/authRedirect";
import { hapticFeedback } from "@/src/utils/haptics";
import { clientTestIds } from "@/src/testing/testIds";

type QuickSection = {
  title: string;
  path: string;
  icon: ComponentProps<typeof FontAwesome>["name"];
  hue: PaletteHue;
  key?: string;
  priority?: string;
};

const adminQuickSections: QuickSection[] = [
  { title: "Panel admin", path: "/admin", icon: "th-large", hue: "blue" },
  { title: "Solicitudes", path: "/care-requests", icon: "list", hue: "indigo" },
  { title: "Nueva solicitud", path: "/create-care-request", icon: "plus-circle", hue: "green" },
  { title: "Cuenta", path: "/account", icon: "user", hue: "purple" },
  { title: "Diagnóstico", path: "/admin/diagnostics", icon: "heartbeat", hue: "neutral" },
  { title: "Herramientas", path: "/admin/tools", icon: "wrench", hue: "neutral" },
];

const clientQuickSections: QuickSection[] = [
  { title: "Necesito cuidado", path: "/create-care-request", key: "crear", priority: "Ahora", icon: "plus-circle", hue: "green" },
  { title: "Ver mis servicios", path: "/care-requests", key: "servicios", priority: "Seguimiento", icon: "list", hue: "blue" },
  { title: "Avisos importantes", path: "/client-notifications", key: "avisos", priority: "Pendiente", icon: "bell", hue: "amber" },
  { title: "Mis datos", path: "/client-profile", key: "perfil", priority: "Cuenta", icon: "user", hue: "purple" },
];

const nurseQuickSections: QuickSection[] = [
  { title: "Mi Nómina", path: "/nurse/payroll", icon: "money", hue: "green" },
  { title: "Solicitudes", path: "/care-requests", icon: "list", hue: "blue" },
  { title: "Mi Calendario", path: "/nurse/calendar", icon: "calendar", hue: "teal" },
  { title: "Cuenta", path: "/nurse/profile", icon: "user", hue: "purple" },
  { title: "Diagnóstico", path: "/admin/diagnostics", icon: "heartbeat", hue: "neutral" },
  { title: "Herramientas", path: "/admin/tools", icon: "wrench", hue: "neutral" },
];

const publicQuickSections: QuickSection[] = [
  { title: "Iniciar sesión", path: "/login", icon: "sign-in", hue: "blue" },
  { title: "Registrar", path: "/register", icon: "user-plus", hue: "green" },
];

export default function HomeScreen() {
  const { isReady, isAuthenticated, roles, requiresAdminReview, requiresProfileCompletion, profileType } = useAuth();
  const isNurseUnderReview = requiresAdminReview && profileType === 1;
  const isAnonymous = !isAuthenticated;
  const isAdmin = roles.includes("ADMIN");
  const isClient = roles.includes("CLIENT");
  const accessState = {
    roles,
    requiresProfileCompletion,
    requiresAdminReview,
  };
  const hasOperationalAccess = isAuthenticated && !requiresProfileCompletion && !isNurseUnderReview;

  if (!isReady) return null;
  if (isAnonymous) return <Redirect href="/login" />;

  if (isAdmin && hasOperationalAccess) {
    return <AdminDashboardScreen />;
  }

  const canCreateRequest = canCreateCareRequests(accessState);
  const canOpenCareRequests = canAccessCareRequests(accessState);
  const canOpenAdminPortal = canAccessAdminPortal(accessState);
  const canOpenSupportTools = canAccessSupportTools(accessState);
  const authenticatedQuickSections = isAdmin
    ? adminQuickSections
    : isClient
      ? clientQuickSections
      : nurseQuickSections;
  const quickSectionsSource = isAnonymous
    ? publicQuickSections
    : authenticatedQuickSections.filter(
      (section) => !isNurseUnderReview || section.path === "/account",
    );
  const quickSectionsToShow = quickSectionsSource.filter((section) => {
    if (section.path === "/create-care-request") {
      return canCreateRequest;
    }
    if (section.path === "/admin") {
      return canOpenAdminPortal;
    }
    if (section.path === "/care-requests") {
      return canOpenCareRequests;
    }
    if (section.path === "/admin/diagnostics" || section.path === "/admin/tools") {
      return canOpenSupportTools;
    }
    return true;
  });
  const heroEyebrow = hasOperationalAccess
    ? isAdmin
      ? "Resumen admin"
    : isClient
      ? "Tus servicios"
        : "Tu jornada"
    : isAnonymous
      ? "Acceso y cuenta"
      : "Estado de cuenta";
  const heroTitle = hasOperationalAccess
    ? isAdmin
      ? "Control rápido de la operación."
      : isClient
        ? "Solicitudes y seguimiento"
        : "Revisa tus servicios desde un solo lugar."
    : isAnonymous
      ? "Cuidado profesional en pocos pasos."
      : canOpenSupportTools
        ? "Tu cuenta está siendo revisada."
        : "Tu cuenta está pendiente de activación.";
  return (
    <MobileWorkspaceShell
      testID={isClient ? clientTestIds.home.screen : undefined}
      nativeID={isClient ? clientTestIds.home.screen : undefined}
      eyebrow={heroEyebrow}
      title="Inicio"
      description={heroTitle}
      actions={
        <>
          {hasOperationalAccess ? (
            <>
              {/* Create is a CLIENT/ADMIN action only — never show it (even disabled)
                  to roles that cannot create, e.g. nurses. */}
              {canCreateRequest ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Crear solicitud"
                  onPress={() => {
                    hapticFeedback.selection();
                    logClientEvent("mobile.ui", "Home hero opened create care request");
                    router.push("/create-care-request");
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Crear solicitud</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir cola de solicitudes"
                onPress={() => {
                  hapticFeedback.selection();
                  logClientEvent("mobile.ui", "Home hero opened care requests queue");
                  if (!isNurseUnderReview) {
                    router.push("/care-requests");
                  }
                }}
                style={({ pressed }) => [
                  // When create isn't available (nurse), the queue is the lead action.
                  canCreateRequest ? styles.secondaryButton : styles.primaryButton,
                  isNurseUnderReview && styles.disabledButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={canCreateRequest ? styles.secondaryButtonText : styles.primaryButtonText}>
                  Abrir cola de solicitudes
                </Text>
              </Pressable>
            </>
          ) : isAnonymous ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Iniciar sesión"
                onPress={() => {
                  hapticFeedback.selection();
                  logClientEvent("mobile.ui", "Home hero opened login");
                  router.push("/login");
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Registrar cuenta"
                onPress={() => {
                  hapticFeedback.selection();
                  logClientEvent("mobile.ui", "Home hero opened register");
                  router.push("/register");
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Registrar cuenta</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir cuenta"
              onPress={() => {
                hapticFeedback.selection();
                logClientEvent("mobile.ui", "Home hero opened account");
                router.push("/account");
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Abrir cuenta</Text>
            </Pressable>
          )}
        </>
      }
    >
      <View style={styles.grid}>
        {quickSectionsToShow.map((section) => {
          const clientSection = section as typeof section & { key?: string; priority?: string };
          const clientSelector = isClient && clientSection.key ? clientTestIds.home.intentCard(clientSection.key) : undefined;
          return (
          <Pressable
            key={section.path}
            testID={clientSelector}
            nativeID={clientSelector}
            accessibilityRole="button"
            accessibilityLabel={section.title}
            onPress={() => {
              hapticFeedback.light();
              logClientEvent("mobile.ui", "Home quick section opened", {
                section: section.path,
              });
              router.push(section.path as never);
            }}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.buttonPressed,
            ]}
          >
            <View style={styles.cardContent}>
              <IconBadge icon={section.icon} hue={section.hue} size={42} iconSize={21} />
              <View style={styles.cardTextBlock}>
                {clientSection.priority ? (
                  <Text style={styles.cardPriority}>{clientSection.priority}</Text>
                ) : null}
                <Text style={styles.cardTitleSmall}>{section.title}</Text>
              </View>
              <Text style={styles.cardChevron}>›</Text>
            </View>
          </Pressable>
          );
        })}
      </View>
    </MobileWorkspaceShell>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  grid: {
    gap: T.spacing.lg,
  },
  card: {
    ...mobileSurfaceCard,
    paddingHorizontal: T.spacing.lg,
    paddingVertical: T.spacing.lg,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: T.spacing.md,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitleSmall: {
    ...T.text.bodyStrong,
    marginBottom: T.spacing.xs,
  },
  cardPriority: {
    ...T.typography.caption,
    color: T.color.ink.accentStrong,
    fontWeight: "900",
    marginBottom: T.spacing.xs,
  },
  primaryButton: {
    backgroundColor: T.color.ink.accent,
    borderRadius: T.radius.lg,
    paddingVertical: T.spacing.lg,
    paddingHorizontal: T.spacing.xl,
    alignItems: "center",
    boxShadow: "0px 6px 12px rgba(18, 48, 68, 0.06)",
  },
  secondaryButton: {
    borderRadius: T.radius.lg,
    paddingVertical: T.spacing.lg,
    paddingHorizontal: T.spacing.xl,
    alignItems: "center",
    backgroundColor: T.color.ink.inverse,
    borderWidth: 1,
    borderColor: T.color.border.strong,
  },
  primaryButtonText: {
    ...T.text.bodyStrong,
    color: T.color.ink.inverse,
    fontWeight: "800",
  },
  secondaryButtonText: {
    ...T.text.bodyStrong,
    color: T.color.ink.accent,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.4,
  },
  cardChevron: {
    ...T.text.title,
    color: T.color.ink.muted,
    fontWeight: "400",
  },
});
