import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

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
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
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
    color: "#111827",
    marginBottom: 4,
  },
  cardBodySmall: {
    fontSize: 13,
    color: "#6b7280",
  },
  primaryButton: {
    backgroundColor: "#007aff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#007aff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#007aff",
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
    color: "#9ca3af",
    fontWeight: "400",
  },
});
