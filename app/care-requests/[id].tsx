import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import {
  getCareRequestById,
  transitionCareRequest,
} from "@/src/services/careRequestService";
import { CareRequestDto, CareRequestTransitionAction } from "@/src/types/careRequest";

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

export default function CareRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { roles } = useAuth();
  const [careRequest, setCareRequest] = useState<CareRequestDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCareRequest = async () => {
    if (!id) {
      return;
    }

    setError(null);

    try {
      const response = await getCareRequestById(id);
      setCareRequest(response);
      logClientEvent("mobile.ui", "Care request detail loaded", { id });
    } catch (nextError: any) {
      setError(nextError.message ?? "Unable to load care request.");
      logClientEvent(
        "mobile.ui",
        "Care request detail failed",
        { id, message: nextError.message ?? "Unknown error" },
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCareRequest();
  }, [id]);

  const runAction = async (action: CareRequestTransitionAction) => {
    if (!id) {
      return;
    }

    setIsActing(true);
    setError(null);

    try {
      const updated = await transitionCareRequest(id, action);
      setCareRequest(updated);
    } catch (nextError: any) {
      setError(nextError.message ?? "Unable to update care request.");
    } finally {
      setIsActing(false);
    }
  };

  const canApproveOrReject =
    roles.includes("Admin") && careRequest?.status === "Pending";
  const canComplete =
    (roles.includes("Admin") || roles.includes("Nurse")) &&
    careRequest?.status === "Approved";

  if (isLoading && !careRequest) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  if (!careRequest) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.errorText}>{error ?? "Care request not found."}</Text>
      </View>
    );
  }

  const colors = getStatusColors(careRequest.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Back To Queue</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>Care Request Detail</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{careRequest.description}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.fg }]}>{careRequest.status}</Text>
          </View>
        </View>

        <View style={styles.metaGroup}>
          <Text style={styles.metaText}>Request ID: {careRequest.id}</Text>
          <Text style={styles.metaText}>Resident ID: {careRequest.residentId}</Text>
          <Text style={styles.metaText}>
            Created: {new Date(careRequest.createdAtUtc).toLocaleString()}
          </Text>
          <Text style={styles.metaText}>
            Updated: {new Date(careRequest.updatedAtUtc).toLocaleString()}
          </Text>
          {careRequest.approvedAtUtc && (
            <Text style={styles.metaText}>
              Approved: {new Date(careRequest.approvedAtUtc).toLocaleString()}
            </Text>
          )}
          {careRequest.rejectedAtUtc && (
            <Text style={styles.metaText}>
              Rejected: {new Date(careRequest.rejectedAtUtc).toLocaleString()}
            </Text>
          )}
          {careRequest.completedAtUtc && (
            <Text style={styles.metaText}>
              Completed: {new Date(careRequest.completedAtUtc).toLocaleString()}
            </Text>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.actionRow}>
          {canApproveOrReject && (
            <>
              <Pressable
                onPress={() => runAction("approve")}
                disabled={isActing}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.successButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Approve</Text>
              </Pressable>
              <Pressable
                onPress={() => runAction("reject")}
                disabled={isActing}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.rejectButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Reject</Text>
              </Pressable>
            </>
          )}

          {canComplete && (
            <Pressable
              onPress={() => runAction("complete")}
              disabled={isActing}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Complete</Text>
            </Pressable>
          )}
        </View>
      </View>
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
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef3fb",
    padding: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fffdf9",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  eyebrow: {
    color: "#2563eb",
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    fontSize: 12,
    marginBottom: 10,
  },
  headerRow: {
    gap: 12,
    marginBottom: 18,
  },
  title: {
    color: "#102a43",
    fontSize: 27,
    lineHeight: 33,
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
  metaGroup: {
    gap: 10,
  },
  metaText: {
    color: "#334e68",
    lineHeight: 21,
  },
  actionRow: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  successButton: {
    backgroundColor: "#166534",
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecdd3",
    backgroundColor: "#fff1f2",
  },
  rejectButton: {
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
  },
  buttonPressed: {
    opacity: 0.92,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: "#be123c",
    fontWeight: "800",
    fontSize: 16,
  },
  errorText: {
    color: "#be123c",
    marginTop: 16,
    lineHeight: 21,
  },
});
