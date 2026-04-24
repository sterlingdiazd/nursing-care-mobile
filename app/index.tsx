import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { designTokens } from "@/src/design-system/tokens";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import {
  canAccessAdminPortal,
  canAccessCareRequests,
  canAccessSupportTools,
  canCreateCareRequests,
} from "@/src/utils/authRedirect";
import { hapticFeedback } from "@/src/utils/haptics";

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
    path: "/diagnostics",
  },
  {
    title: "Herramientas",
    body: "Utilidades avanzadas.",
    path: "/tools",
  },
];

const clientQuickSections = [
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
    path: "/diagnostics",
  },
  {
    title: "Herramientas",
    body: "Utilidades avanzadas.",
    path: "/tools",
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
  const { isAuthenticated, roles, requiresAdminReview, requiresProfileCompletion, profileType } = useAuth();
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
    if (section.path === "/diagnostics" || section.path === "/tools") {
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
      <View style={styles.grid}>
        {quickSectionsToShow.map((section) => (
          <Pressable
            key={section.path}
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
                <Text style={styles.cardTitleSmall}>{section.title}</Text>
                <Text style={styles.cardBodySmall} numberOfLines={1}>{section.body}</Text>
              </View>
              <Text style={styles.cardChevron}>›</Text>
            </View>
          </Pressable>
        ))}
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
    shadowColor: designTokens.color.ink.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
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
    shadowColor: designTokens.color.ink.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
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
