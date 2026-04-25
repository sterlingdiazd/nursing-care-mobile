import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useEffect } from "react";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { getCareRequests } from "@/src/services/careRequestService";
import { CareRequestDto } from "@/src/types/careRequest";
import { canAccessCareRequests } from "@/src/utils/authRedirect";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { usePaginatedList } from "@/src/hooks/usePaginatedList";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";

function getStatusColors(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved":
      return { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText };
    case "Rejected":
      return { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText };
    case "Completed":
    case "Invoiced":
    case "Paid":
      return { bg: designTokens.color.status.infoBg, fg: designTokens.color.ink.accentStrong };
    case "Cancelled":
    case "Voided":
      return { bg: designTokens.color.surface.secondary, fg: designTokens.color.ink.secondary };
    default:
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
  }
}

function getStatusLabel(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved": return "Aprobada";
    case "Rejected": return "Rechazada";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    case "Invoiced": return "Facturada";
    case "Paid": return "Pagada";
    case "Voided": return "Anulada";
    default: return "Pendiente";
  }
}

function CareRequestCard({ item }: { item: CareRequestDto }) {
  const colors = getStatusColors(item.status);
  const statusLabel = getStatusLabel(item.status);

  return (
    <Pressable
      testID={`care-request-card-${item.id}`}
      nativeID={`care-request-card-${item.id}`}
      accessibilityRole="link"
      accessibilityLabel={`Ver detalle de solicitud: ${item.careRequestDescription}`}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/care-requests/[id]",
          params: { id: item.id },
        } as never)
      }
      style={({ pressed }) => [styles.card, pressed && styles.buttonPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.careRequestDescription}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.fg }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>Creada {formatDateTimeES(item.createdAtUtc)}</Text>
    </Pressable>
  );
}

export default function CareRequestsScreen() {
  const { isAuthenticated, isReady, roles, requiresProfileCompletion, requiresAdminReview } = useAuth();
  const canOpenCareRequests = canAccessCareRequests({ roles, requiresProfileCompletion, requiresAdminReview });

  const fetchFn = useCallback(
    async (_page: number, _pageSize: number) => {
      if (!isAuthenticated || !canOpenCareRequests) {
        return { items: [], totalCount: 0, hasMore: false };
      }
      const response = await getCareRequests();
      logClientEvent("mobile.ui", "Care requests loaded", { count: response.length });
      return { items: response, totalCount: response.length, hasMore: false };
    },
    [isAuthenticated, canOpenCareRequests],
  );

  const { data, isLoading, refresh, error } = usePaginatedList(fetchFn);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!canOpenCareRequests) {
      router.replace("/(tabs)");
      return;
    }
  }, [canOpenCareRequests, isAuthenticated, isReady]);

  return (
    <MobileWorkspaceShell
      eyebrow="Cola de solicitudes"
      title="Solicitudes"
      description="Revisa el estado de cada servicio y abre el detalle cuando lo necesites."
      flat
      systemActions={[
        {
          label: "Actualizar cola",
          onPress: refresh,
          variant: "secondary",
        },
        ...((roles.includes("CLIENT") || roles.includes("ADMIN"))
          ? ([
              {
                label: "Crear nueva solicitud",
                onPress: () => router.push("/(tabs)/care-requests/create" as never),
                variant: "primary",
              },
            ] as const)
          : []),
      ]}
    >
      <FlatList
        testID={navigationTestIds.screens.careRequestsListRoot}
        nativeID={navigationTestIds.screens.careRequestsListRoot}
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CareRequestCard item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListHeaderComponent={
          error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>No fue posible cargar las solicitudes</Text>
              <Text style={styles.errorBody}>{error}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
            </View>
          ) : !error ? (
            <View style={styles.loadingState}>
              <Text style={styles.emptyText}>No hay solicitudes disponibles.</Text>
            </View>
          ) : null
        }
      />
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: 14, paddingBottom: 16 },
  buttonPressed: { opacity: 0.88 },
  errorCard: {
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  errorTitle: { color: designTokens.color.ink.danger, fontWeight: "800", fontSize: 15, marginBottom: 6 },
  errorBody: { color: designTokens.color.status.dangerText, lineHeight: 20 },
  loadingState: { paddingVertical: 48, alignItems: "center" },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14 },
  card: {
    backgroundColor: designTokens.color.ink.inverse,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  cardTitle: { flex: 1, color: designTokens.color.ink.primary, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  statusBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  cardMeta: { color: designTokens.color.ink.muted, fontSize: 13, lineHeight: 19 },
});
