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

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import {
  assignCareRequestNurse,
  getActiveNurseProfiles,
  getCareRequestById,
  transitionCareRequest,
  type ActiveNurseProfileSummary,
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

export default function CareRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { roles, userId } = useAuth();
  const [careRequest, setCareRequest] = useState<CareRequestDto | null>(null);
  const [activeNurses, setActiveNurses] = useState<ActiveNurseProfileSummary[]>([]);
  const [assignedNurseId, setAssignedNurseId] = useState("");
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
      setAssignedNurseId(response.assignedNurse ?? "");
      logClientEvent("mobile.ui", "Care request detail loaded", { id });
    } catch (nextError: any) {
      setError(nextError.message ?? "No fue posible cargar la solicitud.");
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
    void loadCareRequest();
  }, [id]);

  useEffect(() => {
    if (!roles.includes("ADMIN")) {
      setActiveNurses([]);
      return;
    }

    void getActiveNurseProfiles()
      .then((response) => setActiveNurses(response))
      .catch(() => setActiveNurses([]));
  }, [roles]);

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
      setError(nextError.message ?? "No fue posible actualizar la solicitud.");
    } finally {
      setIsActing(false);
    }
  };

  const runAssignment = async () => {
    if (!id || !assignedNurseId) {
      return;
    }

    setIsActing(true);
    setError(null);

    try {
      const updated = await assignCareRequestNurse(id, { assignedNurse: assignedNurseId });
      setCareRequest(updated);
      setAssignedNurseId(updated.assignedNurse ?? assignedNurseId);
    } catch (nextError: any) {
      setError(nextError.message ?? "No fue posible asignar la enfermera.");
    } finally {
      setIsActing(false);
    }
  };

  const assignedNurseRecord =
    activeNurses.find((nurse) => nurse.userId === (careRequest?.assignedNurse ?? assignedNurseId)) ?? null;
  const assignedNurseLabel = assignedNurseRecord
    ? [assignedNurseRecord.name, assignedNurseRecord.lastName].filter(Boolean).join(" ") || assignedNurseRecord.email
    : careRequest?.assignedNurse ?? "Sin asignar";
  const canManageAssignment = roles.includes("ADMIN");
  const canApproveOrReject =
    roles.includes("ADMIN") && careRequest?.status === "Pending";
  const canApprove = canApproveOrReject && Boolean(careRequest?.assignedNurse ?? assignedNurseId);
  const canComplete =
    roles.includes("NURSE") &&
    Boolean(userId) &&
    careRequest?.status === "Approved" &&
    careRequest.assignedNurse === userId;

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
        <Text style={styles.errorText}>{error ?? "Solicitud no encontrada."}</Text>
      </View>
    );
  }

  const colors = getStatusColors(careRequest.status);
  const statusLabel = getStatusLabel(careRequest.status);

  return (
    <MobileWorkspaceShell
      eyebrow="Detalle de solicitud"
      title="Revisa contexto, estado y transiciones."
      description="El detalle concentra la lectura operativa y las acciones permitidas segun el rol actual."
      actions={
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backActionButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.backActionButtonText}>Volver a la cola</Text>
        </Pressable>
      }
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Detalle de solicitud</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{careRequest.careRequestDescription}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.fg }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.metaGroup}>
          <Text style={styles.metaText}>ID de solicitud: {careRequest.id}</Text>
          <Text style={styles.metaText}>ID de usuario: {careRequest.userID}</Text>
          <Text style={styles.metaText}>
            Enfermera asignada: {assignedNurseLabel}
          </Text>
          <Text style={styles.metaText}>
            Enfermera sugerida: {careRequest.suggestedNurse ?? "Sin sugerencia"}
          </Text>
          <Text style={styles.metaText}>
            Fecha del servicio: {careRequest.careRequestDate ?? "Sin fecha"}
          </Text>
          <Text style={styles.metaText}>
            Creada: {new Date(careRequest.createdAtUtc).toLocaleString()}
          </Text>
          <Text style={styles.metaText}>
            Actualizada: {new Date(careRequest.updatedAtUtc).toLocaleString()}
          </Text>
          {careRequest.approvedAtUtc && (
            <Text style={styles.metaText}>
              Aprobada: {new Date(careRequest.approvedAtUtc).toLocaleString()}
            </Text>
          )}
          {careRequest.rejectedAtUtc && (
            <Text style={styles.metaText}>
              Rechazada: {new Date(careRequest.rejectedAtUtc).toLocaleString()}
            </Text>
          )}
          {careRequest.completedAtUtc && (
            <Text style={styles.metaText}>
              Completada: {new Date(careRequest.completedAtUtc).toLocaleString()}
            </Text>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {canManageAssignment && (
          <View style={styles.assignmentCard}>
            <Text style={styles.sectionEyebrow}>Asignacion de enfermeria</Text>
            <Text style={styles.assignmentCopy}>
              Solo administracion puede asignar o reasignar la solicitud antes de aprobarla.
            </Text>

            {activeNurses.length === 0 ? (
              <Text style={styles.assignmentEmpty}>No hay enfermeras activas disponibles.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.nurseList}
              >
                {activeNurses.map((nurse) => {
                  const label =
                    [nurse.name, nurse.lastName].filter(Boolean).join(" ") || nurse.email;
                  const selected = assignedNurseId === nurse.userId;

                  return (
                    <Pressable
                      key={nurse.userId}
                      onPress={() => setAssignedNurseId(nurse.userId)}
                      style={({ pressed }) => [
                        styles.nurseChip,
                        selected && styles.nurseChipSelected,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={[styles.nurseChipText, selected && styles.nurseChipTextSelected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Pressable
              onPress={runAssignment}
              disabled={isActing || !assignedNurseId}
              style={({ pressed }) => [
                styles.primaryButton,
                (!assignedNurseId || isActing) && styles.disabledButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {careRequest.assignedNurse ? "Reasignar enfermera" : "Asignar enfermera"}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.actionRow}>
          {canApproveOrReject && (
            <>
              <Pressable
                onPress={() => runAction("approve")}
                disabled={isActing || !canApprove}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.successButton,
                  (!canApprove || isActing) && styles.disabledButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Aprobar</Text>
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
                <Text style={styles.secondaryButtonText}>Rechazar</Text>
              </Pressable>
            </>
          )}

          {canApproveOrReject && !canApprove && (
            <Text style={styles.assignmentWarning}>
              Debes asignar una enfermera activa antes de aprobar la solicitud.
            </Text>
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
              <Text style={styles.primaryButtonText}>Completar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef3fb",
    padding: 24,
  },
  backActionButton: {
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backActionButtonText: {
    color: "#f8fafc",
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
  assignmentCard: {
    marginTop: 24,
    gap: 12,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  sectionEyebrow: {
    color: "#2563eb",
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: 12,
  },
  assignmentCopy: {
    color: "#52637a",
    lineHeight: 21,
  },
  assignmentEmpty: {
    color: "#7c2d12",
    lineHeight: 21,
  },
  nurseList: {
    gap: 10,
    paddingRight: 8,
  },
  nurseChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d7e3fb",
    backgroundColor: "#eef4ff",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nurseChipSelected: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  nurseChipText: {
    color: "#163561",
    fontWeight: "700",
  },
  nurseChipTextSelected: {
    color: "#fff",
  },
  metaText: {
    color: "#334e68",
    lineHeight: 21,
  },
  assignmentWarning: {
    color: "#92400e",
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
  disabledButton: {
    opacity: 0.45,
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
