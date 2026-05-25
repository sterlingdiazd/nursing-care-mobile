import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { designTokens } from "@/src/design-system/tokens";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
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

const adminQuickSections = [
  {
    title: "Panel admin",
    body: "Indicadores y accesos administrativos.",
    path: "/admin",
  },
  {
    title: "Solicitudes",
    body: "Cola activa y seguimiento.",
    path: "/care-requests",
  },
  {
    title: "Nueva solicitud",
    body: "Registrar un nuevo servicio.",
    path: "/create-care-request",
  },
  {
    title: "Cuenta",
    body: "Sesion, acceso y perfil.",
    path: "/account",
  },
  {
    title: "Diagnostico",
    body: "Estado tecnico y errores.",
    path: "/admin/diagnostics",
  },
  {
    title: "Herramientas",
    body: "Utilidades avanzadas.",
    path: "/admin/tools",
  },
];

const clientQuickSections = [
  {
    title: "Necesito cuidado",
    body: "Cuéntanos qué necesitas y te guiamos paso a paso.",
    path: "/create-care-request",
    key: "crear",
    priority: "Ahora",
  },
  {
    title: "Ver mis servicios",
    body: "Estado, fechas y pago de tus solicitudes.",
    path: "/care-requests",
    key: "servicios",
    priority: "Seguimiento",
  },
  {
    title: "Avisos importantes",
    body: "Cambios recientes de tus solicitudes.",
    path: "/client-notifications",
    key: "avisos",
    priority: "Pendiente",
  },
  {
    title: "Mis datos",
    body: "Perfil y contacto de emergencia.",
    path: "/client-profile",
    key: "perfil",
    priority: "Cuenta",
  },
];

const nurseQuickSections = [
  {
    title: "Mi Nomina",
    body: "Resumen de compensaciones y historial de pagos.",
    path: "/nurse/payroll",
  },
  {
    title: "Solicitudes",
    body: "Servicios asignados y seguimiento.",
    path: "/care-requests",
  },
  {
    title: "Diagnostico",
    body: "Estado tecnico y errores.",
    path: "/admin/diagnostics",
  },
  {
    title: "Herramientas",
    body: "Utilidades avanzadas.",
    path: "/admin/tools",
  },
];

const publicQuickSections = [
  {
    title: "Iniciar sesion",
    body: "Entrar con tu cuenta.",
    path: "/login",
  },
  {
    title: "Registrar",
    body: "Crear una cuenta nueva.",
    path: "/register",
  },
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
      ? "Control rapido de la operacion."
      : isClient
        ? "Solicita y da seguimiento sin complicaciones."
        : "Revisa tus servicios desde un solo lugar."
    : isAnonymous
      ? "Cuidado profesional en pocos pasos."
      : canOpenSupportTools
        ? "Tu cuenta tiene acceso restringido."
        : "Tu cuenta aun no puede operar.";
  const heroDescription = hasOperationalAccess
    ? isAdmin
      ? "Accede a panel, solicitudes y herramientas segun tus permisos."
      : isClient
        ? "Crea solicitudes, revisa su estado y administra tu cuenta."
        : "Consulta servicios asignados y estado de tu cuenta."
    : isAnonymous
      ? "Inicia sesion o crea tu cuenta para solicitar servicios y dar seguimiento."
      : canOpenSupportTools
        ? "Mientras termina la revision administrativa, solo veras accesos permitidos para tu perfil."
        : "Mientras termina la revision administrativa, no veras funciones operativas.";
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
                accessibilityLabel="Iniciar sesion"
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
      {isClient && hasOperationalAccess ? (
        <View style={styles.assistantPanel}>
          <Text style={styles.assistantEyebrow}>¿Qué necesitas hoy?</Text>
          <Text style={styles.assistantTitle}>Elige una opción y seguimos contigo.</Text>
          <Text style={styles.assistantBody}>
            Mostramos primero las acciones más comunes para evitar pasos técnicos.
          </Text>
        </View>
      ) : null}
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
              <View>
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
  assistantPanel: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
    marginBottom: designTokens.spacing.lg,
  },
  assistantEyebrow: {
    color: designTokens.color.ink.accentStrong,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  assistantTitle: {
    color: designTokens.color.ink.primary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
  },
  assistantBody: {
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
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
    gap: 16,
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
