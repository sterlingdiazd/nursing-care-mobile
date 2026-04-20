import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { getCareRequests } from "@/src/services/careRequestService";
import { CareRequestDto } from "@/src/types/careRequest";
import { canAccessCareRequests } from "@/src/utils/authRedirect";

function getStatusColors(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved":
      return { bg: "#dcfce7", fg: "#166534" };
    case "Rejected":
      return { bg: "#fee2e2", fg: "#991b1b" };
    case "Completed":
      return { bg: "#dbeafe", fg: "#1d4ed8" };
    default:
      return { bg: "#fef3c7", fg: "#92400e" };
  }
}

function getStatusLabel(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved":
      return "Aprobada";
    case "Rejected":
      return "Rechazada";
    case "Completed":
      return "Completada";
    default:
      return "Pendiente";
  }
}

export default function CareRequestsScreen() {
  const { isAuthenticated, isReady, roles, requiresProfileCompletion, requiresAdminReview } = useAuth();
  const [careRequests, setCareRequests] = useState<CareRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canOpenCareRequests = canAccessCareRequests({
    roles,
    requiresProfileCompletion,
    requiresAdminReview,
  });

  const loadCareRequests = async () => {
    if (!isAuthenticated) {
      setCareRequests([]);
      setError("Inicia sesion para cargar tus solicitudes.");
      setIsLoading(false);
      return;
    }

    if (!canOpenCareRequests) {
      setCareRequests([]);
      setError("Tu cuenta no tiene acceso operativo a esta cola en este momento.");
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await getCareRequests();
      setCareRequests(response);
      logClientEvent("mobile.ui", "Care requests loaded", { count: response.length });
    } catch (nextError: any) {
      setError(nextError.message ?? "No fue posible cargar las solicitudes.");
      logClientEvent(
        "mobile.ui",
        "Care requests load failed",
        { message: nextError.message ?? "Unknown error" },
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!canOpenCareRequests) {
      router.replace("/");
      return;
    }

    void loadCareRequests();
  }, [canOpenCareRequests, isAuthenticated, isReady]);

  return (
    <MobileWorkspaceShell
      eyebrow="Cola de solicitudes"
      title="Solicitudes"
      description="Revisa el estado de cada servicio y abre el detalle cuando lo necesites."
      actions={
        <>
          <Pressable
            onPress={loadCareRequests}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Actualizar cola</Text>
          </Pressable>

          {(roles.includes("CLIENT") || roles.includes("ADMIN")) && (
            <Pressable
              onPress={() => router.push("/create-care-request")}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Crear nueva solicitud</Text>
            </Pressable>
          )}
        </>
      }
    >
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No fue posible cargar las solicitudes</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      )}

      {isLoading && careRequests.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#1d4ed8" />
        </View>
      ) : (
        <View style={styles.list}>
          {careRequests.map((careRequest) => {
            const colors = getStatusColors(careRequest.status);
            const statusLabel = getStatusLabel(careRequest.status);

            return (
              <Pressable
                key={careRequest.id}
                testID={`care-request-card-${careRequest.id}`}
                nativeID={`care-request-card-${careRequest.id}`}
                accessibilityRole="link"
                onPress={() =>
                  router.push({
                    pathname: "/care-requests/[id]",
                    params: { id: careRequest.id },
                  } as never)
                }
                style={({ pressed }) => [styles.card, pressed && styles.buttonPressed]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {careRequest.careRequestDescription}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.statusText, { color: colors.fg }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>Usuario {careRequest.userID}</Text>
                <Text style={styles.cardMeta}>
                  Creada {new Date(careRequest.createdAtUtc).toLocaleString()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: "#007aff",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#007aff",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  errorCard: {
    backgroundColor: "#fff1f2",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  errorTitle: {
    color: "#be123c",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 6,
  },
  errorBody: {
    color: "#9f1239",
    lineHeight: 20,
  },
  loadingState: {
    paddingVertical: 48,
    alignItems: "center",
  },
  list: {
    gap: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    color: "#111827",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardMeta: {
    color: "#4b5563",
    fontSize: 13,
    lineHeight: 19,
  },
});
