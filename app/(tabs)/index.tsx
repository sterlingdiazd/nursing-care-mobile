import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { designTokens, type PaletteHue } from "@/src/design-system/tokens";

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
  body: string;
  path: string;
  icon: ComponentProps<typeof FontAwesome>["name"];
  hue: PaletteHue;
  key?: string;
  priority?: string;
};

const adminQuickSections: QuickSection[] = [
  { title: "Panel admin", body: "Indicadores y accesos administrativos.", path: "/admin", icon: "th-large", hue: "blue" },
  { title: "Solicitudes", body: "Cola activa y seguimiento.", path: "/care-requests", icon: "list", hue: "indigo" },
  { title: "Nueva solicitud", body: "Registrar un nuevo servicio.", path: "/create-care-request", icon: "plus-circle", hue: "green" },
  { title: "Cuenta", body: "Sesión, acceso y perfil.", path: "/account", icon: "user", hue: "purple" },
  { title: "Diagnóstico", body: "Estado técnico y errores.", path: "/admin/diagnostics", icon: "heartbeat", hue: "neutral" },
  { title: "Herramientas", body: "Utilidades avanzadas.", path: "/admin/tools", icon: "wrench", hue: "neutral" },
];

const clientQuickSections: QuickSection[] = [
  { title: "Necesito cuidado", body: "Crea una nueva solicitud de cuidado.", path: "/create-care-request", key: "crear", priority: "Ahora", icon: "plus-circle", hue: "green" },
  { title: "Ver mis servicios", body: "Estado, fechas y pago de tus solicitudes.", path: "/care-requests", key: "servicios", priority: "Seguimiento", icon: "list", hue: "blue" },
  { title: "Avisos importantes", body: "Cambios recientes de tus solicitudes.", path: "/client-notifications", key: "avisos", priority: "Pendiente", icon: "bell", hue: "amber" },
  { title: "Mis datos", body: "Perfil y contacto de emergencia.", path: "/client-profile", key: "perfil", priority: "Cuenta", icon: "user", hue: "purple" },
];

const nurseQuickSections: QuickSection[] = [
  { title: "Mi Nómina", body: "Resumen de compensaciones y historial de pagos.", path: "/nurse/payroll", icon: "money", hue: "green" },
  { title: "Solicitudes", body: "Servicios asignados y seguimiento.", path: "/care-requests", icon: "list", hue: "blue" },
  { title: "Diagnóstico", body: "Estado técnico y errores.", path: "/admin/diagnostics", icon: "heartbeat", hue: "neutral" },
  { title: "Herramientas", body: "Utilidades avanzadas.", path: "/admin/tools", icon: "wrench", hue: "neutral" },
];

const publicQuickSections: QuickSection[] = [
  { title: "Iniciar sesión", body: "Entrar con tu cuenta.", path: "/login", icon: "sign-in", hue: "blue" },
  { title: "Registrar", body: "Crear una cuenta nueva.", path: "/register", icon: "user-plus", hue: "green" },
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
        ? "Tu cuenta tiene acceso restringido."
        : "Tu cuenta aún no puede operar.";
  const heroDescription = hasOperationalAccess
    ? isAdmin
      ? "Accede a panel, solicitudes y herramientas según tus permisos."
      : isClient
        ? "Servicios, avisos y datos de cuenta."
        : "Consulta servicios asignados y estado de tu cuenta."
    : isAnonymous
      ? "Inicia sesión o crea tu cuenta para solicitar servicios y dar seguimiento."
      : canOpenSupportTools
        ? "Mientras termina la revisión administrativa, solo verás accesos permitidos para tu perfil."
        : "Mientras termina la revisión administrativa, no verás funciones operativas.";
  return (
    <MobileWorkspaceShell
      testID={isClient ? clientTestIds.home.screen : undefined}
      nativeID={isClient ? clientTestIds.home.screen : undefined}
      eyebrow={heroEyebrow}
      title={heroTitle}
      description={heroDescription}
      actions={
        <>
          {hasOperationalAccess ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Crear solicitud"
                onPress={() => {
                  hapticFeedback.selection();
                  logClientEvent("mobile.ui", "Home hero opened create care request");
                  if (canCreateRequest) {
                    router.push("/create-care-request");
                  }
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  !canCreateRequest && styles.disabledButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Crear solicitud</Text>
              </Pressable>

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
                  styles.secondaryButton,
                  isNurseUnderReview && styles.disabledButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Abrir cola de solicitudes</Text>
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
                <Text style={styles.primaryButtonText}>Iniciar sesion</Text>
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
                <Text style={styles.cardBodySmall} numberOfLines={2}>{section.body}</Text>
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

const styles = StyleSheet.create({
  grid: {
    gap: 14,
  },
  card: {
    backgroundColor: designTokens.color.ink.inverse,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    boxShadow: "0px 6px 12px rgba(18, 48, 68, 0.06)",
elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitleSmall: {
    fontSize: 15,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: 4,
  },
  cardPriority: {
    color: designTokens.color.ink.accentStrong,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
  },
  cardBodySmall: {
    fontSize: 13,
    color: designTokens.color.ink.muted,
  },
  primaryButton: {
    backgroundColor: designTokens.color.ink.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    boxShadow: "0px 6px 12px rgba(18, 48, 68, 0.06)",
},
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: designTokens.color.ink.inverse,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  primaryButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: designTokens.color.ink.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.4,
  },
  cardChevron: {
    fontSize: 24,
    lineHeight: 24,
    color: designTokens.color.ink.muted,
    fontWeight: "400",
  },
});
