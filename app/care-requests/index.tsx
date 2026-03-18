import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { getCareRequests } from "@/src/services/careRequestService";
import { CareRequestDto } from "@/src/types/careRequest";

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

export default function CareRequestsScreen() {
  const { roles } = useAuth();
  const [careRequests, setCareRequests] = useState<CareRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCareRequests = async () => {
    setError(null);

    try {
      const response = await getCareRequests();
      setCareRequests(response);
      logClientEvent("mobile.ui", "Care requests loaded", { count: response.length });
    } catch (nextError: any) {
      setError(nextError.message ?? "Unable to load care requests.");
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
    loadCareRequests();
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadCareRequests} />}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Request Board</Text>
        <Text style={styles.title}>Move requests through the full care lifecycle.</Text>
        <Text style={styles.subtitle}>
          Open a request to review detail, then approve, reject, or complete it based on your role.
        </Text>
        {(roles.includes("Nurse") || roles.includes("Admin")) && (
          <Pressable
            onPress={() => router.push("/create-care-request")}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>Create New Request</Text>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load requests</Text>
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

            return (
              <Pressable
                key={careRequest.id}
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
                    {careRequest.description}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.statusText, { color: colors.fg }]}>
                      {careRequest.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>Resident {careRequest.residentId}</Text>
                <Text style={styles.cardMeta}>
                  Created {new Date(careRequest.createdAtUtc).toLocaleString()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef3fb",
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: "#102a43",
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },
  eyebrow: {
    color: "#93c5fd",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 10,
  },
  title: {
    color: "#f8fafc",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: "#fef3c7",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#132d75",
    fontWeight: "800",
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.92,
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
    backgroundColor: "#fffdf9",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    color: "#102a43",
    fontSize: 19,
    lineHeight: 25,
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
    color: "#52637a",
    fontSize: 14,
    lineHeight: 20,
  },
});
