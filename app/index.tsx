import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { formatRoleLabels } from "@/src/utils/roleLabels";

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
      <View style={styles.grid}>
        <View style={styles.sessionCard}>
          <Text style={styles.sessionEyebrow}>Sesion actual</Text>
          <Text style={styles.sessionTitle}>{sessionTitle}</Text>
          <Text style={styles.sessionBody}>{sessionBody}</Text>
          {isNurseUnderReview ? (
            <Text style={styles.reviewNote}>
              Tu cuenta de enfermeria espera que administracion complete el perfil. El acceso operativo se habilitara despues de esa completacion.
            </Text>
          ) : null}
        </View>

        {quickSectionsToShow.map((section) => (
          <Pressable
            key={section.path}
            onPress={() => {
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
            <Text style={styles.cardEyebrow}>Seccion</Text>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <Text style={styles.cardBody}>{section.body}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.recommendedCard}>
        <Text style={styles.cardEyebrow}>Flujo recomendado</Text>
        <Text style={styles.cardTitle}>
          {hasOperationalAccess ? "Un recorrido simple y profesional." : isAnonymous ? "Primero acceso, despues operacion." : "Estado claro mientras esperas aprobacion."}
        </Text>
        {recommendedSteps.map((step) => (
          <Text key={step} style={styles.cardBody}>{step}</Text>
        ))}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 14,
  },
  sessionCard: {
    backgroundColor: "#123047",
    borderRadius: 24,
    padding: 18,
  },
  sessionEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: "#bde0dd",
    marginBottom: 8,
  },
  sessionTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    color: "#fffef8",
    marginBottom: 8,
  },
  sessionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(232, 241, 247, 0.78)",
  },
  card: {
    backgroundColor: "#fffdf9",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  recommendedCard: {
    backgroundColor: "#f3ede0",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e7d4b8",
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: "#2563eb",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    color: "#102a43",
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#52637a",
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: "#fef3c7",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  primaryButtonText: {
    color: "#132d75",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.92,
  },
  disabledButton: {
    opacity: 0.55,
  },
  reviewNote: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#fde68a",
  },
});
