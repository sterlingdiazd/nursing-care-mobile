import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { formatRoleLabels } from "@/src/utils/roleLabels";
import { hapticFeedback } from "@/src/utils/haptics";

const authenticatedQuickSections = [
  {
    title: "Panel admin",
    body: "Accede a indicadores, cola administrativa y notificaciones del portal de administracion.",
    path: "/admin",
  },
  {
    title: "Solicitudes",
    body: "Revisa la cola viva, abre el detalle y recorre el ciclo completo de cada solicitud.",
    path: "/care-requests",
  },
  {
    title: "Nueva solicitud",
    body: "Captura una solicitud con un flujo guiado y asociacion automatica al usuario autenticado.",
    path: "/create-care-request",
  },
  {
    title: "Cuenta",
    body: "Gestiona Google OAuth, login manual, estado de sesion y salida segura.",
    path: "/account",
  },
  {
    title: "Diagnostico",
    body: "Comprueba backend, revisa errores y consulta logs recientes del cliente.",
    path: "/diagnostics",
  },
  {
    title: "Herramientas",
    body: "Agrupa utilidades avanzadas y opciones de depuracion sin contaminar los flujos principales.",
    path: "/tools",
  },
];

const publicQuickSections = [
  {
    title: "Cuenta",
    body: "Consulta el estado de la sesion actual y centraliza el acceso desde Google o login manual.",
    path: "/account",
  },
  {
    title: "Iniciar sesion",
    body: "Entra con tu cuenta existente antes de abrir solicitudes o trabajar en la cola.",
    path: "/login",
  },
  {
    title: "Registrar",
    body: "Completa tu alta si todavia no tienes perfil en la plataforma.",
    path: "/register",
  },
];

export default function HomeScreen() {
  const { email, isAuthenticated, roles, requiresAdminReview, requiresProfileCompletion, profileType } = useAuth();
  const isNurseUnderReview = requiresAdminReview && profileType === 1;
  const isAnonymous = !isAuthenticated;
  const hasOperationalAccess = isAuthenticated && !requiresProfileCompletion && !isNurseUnderReview;
  const canCreateRequest = (roles.includes("CLIENT") || roles.includes("ADMIN")) && !isNurseUnderReview;
  const quickSectionsSource = isAnonymous
    ? publicQuickSections
    : authenticatedQuickSections.filter(
      (section) => !isNurseUnderReview || (section.path !== "/care-requests" && section.path !== "/create-care-request"),
    );
  const quickSectionsToShow = quickSectionsSource.filter((section) => {
    if (section.path === "/create-care-request") {
      return roles.includes("CLIENT") || roles.includes("ADMIN");
    }
    if (section.path === "/admin") {
      return roles.includes("ADMIN");
    }
    return true;
  });
  const heroEyebrow = hasOperationalAccess ? "Resumen operativo" : isAnonymous ? "Acceso y cuenta" : "Estado de cuenta";
  const heroTitle = hasOperationalAccess
    ? "Una consola mobile clara para navegar, capturar y supervisar."
    : isAnonymous
      ? "Accede primero a tu cuenta antes de entrar al flujo operativo."
      : "Tu cuenta necesita una validacion adicional antes de operar.";
  const heroDescription = hasOperationalAccess
    ? "La app ahora se organiza como un workspace: secciones visibles desde el inicio, navegacion lateral consistente y accesos directos segun el estado de la sesion."
    : isAnonymous
      ? "La pantalla principal publica se concentra en acceso, registro y estado de sesion. Las solicitudes y acciones operativas aparecen solo despues de autenticarte."
      : "Mientras la revision administrativa siga pendiente, la pantalla principal prioriza estado, cuenta y herramientas no operativas.";
  const sessionTitle = hasOperationalAccess
    ? "La experiencia ya esta lista para operar."
    : isAnonymous
      ? "Necesitas iniciar sesion para ver solicitudes y acciones operativas."
      : "Tu sesion esta activa, pero el acceso operativo sigue limitado.";
  const sessionBody = isAuthenticated
    ? `${email ?? "No hay cuenta cargada"} • ${formatRoleLabels(roles)}`
    : "Sin sesion activa • Accede o registrate para continuar";
  const recommendedSteps = hasOperationalAccess
    ? [
      "1. Revisa el resumen y el estado de tu sesion.",
      "2. Entra a la cola para revisar solicitudes activas.",
      "3. Usa Nueva solicitud cuando necesites capturar trabajo nuevo.",
      "4. Abre Cuenta o Diagnostico solo cuando el flujo lo requiera.",
    ]
    : isAnonymous
      ? [
        "1. Inicia sesion o registrate desde esta pantalla.",
        "2. Completa tu perfil si la plataforma te lo solicita.",
        "3. Vuelve al resumen para desbloquear solicitudes y acciones segun tu rol.",
      ]
      : [
        "1. Revisa el estado actual de tu cuenta.",
        "2. Ve a Cuenta si necesitas cambiar sesion o confirmar acceso.",
        "3. Espera la completacion administrativa para habilitar la operacion completa.",
      ];

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
      <View style={styles.recommendedCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEyebrow}>Flujo recomendado</Text>
        </View>
        <Text style={styles.cardTitle}>
          {hasOperationalAccess ? "Recorrido profesional" : isAnonymous ? "Acceso inicial" : "Estado de validación"}
        </Text>
        <View style={styles.stepsList}>
          {recommendedSteps.map((step, idx) => (
            <View key={idx} style={styles.stepItem}>
              <View style={styles.stepBullet} />
              <Text style={styles.cardBody}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.sessionCard}>
          <Text style={styles.sessionEyebrow}>Sesión actual</Text>
          <Text style={styles.sessionTitle}>{sessionTitle}</Text>
          <View style={styles.sessionMeta}>
             <Text style={styles.sessionBody}>{sessionBody}</Text>
          </View>
          {isNurseUnderReview ? (
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewNote}>
                Revisión administrativa pendiente.
              </Text>
            </View>
          ) : null}
        </View>

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
            <View style={styles.cardIconPlaceholder} />
            <Text style={styles.cardTitleSmall}>{section.title}</Text>
            <Text style={styles.cardBodySmall} numberOfLines={2}>{section.body}</Text>
          </Pressable>
        ))}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  sessionCard: {
    width: "100%",
    backgroundColor: "#102a43",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#102a43",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  sessionEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#9fb3c8",
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  sessionMeta: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  sessionBody: {
    fontSize: 15,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  card: {
    width: "47.5%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 8,
  },
  recommendedCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 8,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#b45309",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#78350f",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  cardTitleSmall: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  stepsList: {
    gap: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
    marginRight: 10,
  },
  cardBody: {
    fontSize: 15,
    color: "#92400e",
    lineHeight: 22,
    fontWeight: "500",
  },
  cardBodySmall: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: "#fbbf24",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  primaryButtonText: {
    color: "#451a03",
    fontSize: 17,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.4,
  },
  reviewBadge: {
    marginTop: 16,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  reviewNote: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400e",
  },
  cardIconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    marginBottom: 12,
  },
});
