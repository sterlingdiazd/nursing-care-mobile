import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";

const quickSections = [
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

export default function HomeScreen() {
  const { email, isAuthenticated, roles, requiresAdminReview, profileType } = useAuth();
  const isNurseUnderReview = requiresAdminReview && profileType === 1;

  return (
    <MobileWorkspaceShell
      eyebrow="Resumen operativo"
      title="Una consola mobile clara para navegar, capturar y supervisar."
      description="La app ahora se organiza como un workspace: secciones visibles desde el inicio, navegacion lateral consistente y accesos directos segun el estado de la sesion."
      actions={
        <>
          <Pressable
            onPress={() => {
              logClientEvent("mobile.ui", "Home hero opened create care request");
              if (!isNurseUnderReview) {
                router.push("/create-care-request");
              }
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              isNurseUnderReview && styles.disabledButton,
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
      }
    >
      <View style={styles.grid}>
        <View style={styles.sessionCard}>
          <Text style={styles.sessionEyebrow}>Sesion actual</Text>
          <Text style={styles.sessionTitle}>
            {isAuthenticated ? "La experiencia ya esta lista para operar." : "Necesitas iniciar sesion para operar con normalidad."}
          </Text>
          <Text style={styles.sessionBody}>
            {email ?? "No hay cuenta cargada"} • {roles.length > 0 ? roles.join(", ") : "Sin roles cargados"}
          </Text>
          {isNurseUnderReview ? (
            <Text style={styles.reviewNote}>
              Tu cuenta de enfermeria esta en revision administrativa. El acceso operativo se habilitara cuando completen tu perfil.
            </Text>
          ) : null}
        </View>

        {quickSections.map((section) => (
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
        <Text style={styles.cardTitle}>Un recorrido simple y profesional.</Text>
        <Text style={styles.cardBody}>1. Revisa el resumen y el estado de tu sesion.</Text>
        <Text style={styles.cardBody}>2. Entra a la cola para revisar solicitudes activas.</Text>
        <Text style={styles.cardBody}>3. Usa Nueva solicitud cuando necesites capturar trabajo nuevo.</Text>
        <Text style={styles.cardBody}>4. Abre Cuenta o Diagnostico solo cuando el flujo lo requiera.</Text>
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
