import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { getCachedAuthSession } from "@/src/services/authSession";
import {
  getNursePayrollSummary,
  getNursePayrollHistory,
  getNursePayrollPeriodDetail,
  getNursePayrollVoucherUrl,
  type NursePayrollSummaryDto,
  type PayrollPeriodListItemDto,
  type NursePayrollPeriodDetailDto,
} from "@/src/services/payrollService";
import { designTokens } from "@/src/design-system/tokens";
import { useToast } from "@/src/components/shared/ToastProvider";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { hapticFeedback } from "@/src/utils/haptics";

export default function NursePayrollScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId?: string }>();
  const { userId: authUserId, isReady, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<NursePayrollSummaryDto | null>(null);
  const [history, setHistory] = useState<PayrollPeriodListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null);
  const [periodDetail, setPeriodDetail] = useState<NursePayrollPeriodDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [downloadingVoucher, setDownloadingVoucher] = useState(false);
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;

    const nurseId = paramUserId || authUserId;
    if (!nurseId) {
      setError("No se pudo identificar al usuario");
      setLoading(false);
      return;
    }
    if (fetchedForRef.current === nurseId) return;
    fetchedForRef.current = nurseId;

    const loadData = async () => {
      try {
        setLoading(true);
        const [sum, hist] = await Promise.all([
          getNursePayrollSummary(nurseId),
          getNursePayrollHistory(nurseId),
        ]);
        setSummary(sum);
        setHistory(hist);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [isReady, isAuthenticated, paramUserId, authUserId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount);
  };

  const handlePeriodPress = async (periodId: string) => {
    hapticFeedback.selection();
    if (expandedPeriodId === periodId) {
      setExpandedPeriodId(null);
      setPeriodDetail(null);
      setDetailError(null);
      return;
    }

    setExpandedPeriodId(periodId);
    setPeriodDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const detail = await getNursePayrollPeriodDetail(periodId);
      setPeriodDetail(detail);
    } catch (e) {
      console.error(e);
      setDetailError(e instanceof Error ? e.message : "Error al cargar el detalle del periodo");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadVoucher = async (periodId: string) => {
    if (downloadingVoucher) return;
    hapticFeedback.light();
    setDownloadingVoucher(true);
    try {
      const session = getCachedAuthSession();
      const token = session?.token;
      if (!token) {
        showToast({ variant: "error", message: "No hay sesión activa." });
        return;
      }
      const url = getNursePayrollVoucherUrl(periodId);
      const fileUri = FileSystem.documentDirectory + `comprobante-${periodId}.pdf`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          showToast({ variant: "error", message: "Archivo descargado pero compartir no está disponible." });
        }
      } else {
        showToast({ variant: "error", message: "No fue posible descargar el comprobante." });
      }
    } catch (e) {
      console.error(e);
      showToast({ variant: "error", message: e instanceof Error ? e.message : "Error al descargar el comprobante." });
    } finally {
      setDownloadingVoucher(false);
    }
  };

  const currentPeriodOpen = summary?.currentPeriodStatus === "Open";

  if (loading) {
    return (
      <MobileWorkspaceShell title="Mi Nómina">
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            color={designTokens.color.ink.accentStrong}
            accessibilityLabel="Cargando..."
          />
        </View>
      </MobileWorkspaceShell>
    );
  }

  return (
    <MobileWorkspaceShell title="Mi Nómina">
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollPad}>
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {summary?.currentPeriodId ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroEyebrow}>Período actual</Text>
              <StatusBadge label={currentPeriodOpen ? "Abierto" : "Cerrado"} tone={currentPeriodOpen ? "success" : "neutral"} />
            </View>
            <Text style={styles.heroAmount}>
              {formatCurrency(summary.totalCompensationThisPeriod)}
            </Text>
            <Text style={styles.heroPeriod}>
              {summary.currentPeriodStartDate ? formatDateES(summary.currentPeriodStartDate) : ""} – {summary.currentPeriodEndDate ? formatDateES(summary.currentPeriodEndDate) : ""}
            </Text>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Período actual</Text>
            <Text style={styles.emptyText}>No hay período de nómina activo.</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de pagos</Text>

          {history.length === 0 ? (
            <Text style={styles.emptyHint}>No hay historial de pagos.</Text>
          ) : (
            history.map((period) => {
              const isOpen = period.status === "Open";
              const isExpanded = expandedPeriodId === period.id;
              return (
                <View key={period.id} style={styles.historyGroup}>
                  <Pressable
                    style={[styles.historyItem, isExpanded && styles.historyItemExpanded]}
                    onPress={() => handlePeriodPress(period.id)}
                    testID={`nurse-payroll-period-item-${period.id}`}
                    nativeID={`nurse-payroll-period-item-${period.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Período ${period.startDate} a ${period.endDate}, ${isOpen ? "abierto" : "cerrado"}`}
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyDate}>
                        {formatDateES(period.startDate)} – {formatDateES(period.endDate)}
                      </Text>
                      <StatusBadge label={isOpen ? "Abierto" : "Cerrado"} tone={isOpen ? "success" : "neutral"} />
                    </View>
                    <View style={styles.historyBottomRow}>
                      <Text style={styles.historyInfo}>{period.totalNurses} servicios</Text>
                      <Text style={styles.historyAmount}>
                        {formatCurrency(period.totalCompensation)}
                      </Text>
                    </View>
                    <Text style={styles.expandIndicator}>
                      {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                    </Text>
                  </Pressable>

                  {isExpanded && (
                    <View
                      style={styles.detailContainer}
                      testID={`nurse-payroll-period-detail-${period.id}`}
                      nativeID={`nurse-payroll-period-detail-${period.id}`}
                    >
                      {detailLoading && (
                        <View style={styles.detailLoader}>
                          <ActivityIndicator
                            size="small"
                            color={designTokens.color.ink.accentStrong}
                            accessibilityLabel="Cargando..."
                          />
                          <Text style={styles.detailLoaderText}>Cargando detalle...</Text>
                        </View>
                      )}

                      {detailError && !detailLoading && (
                        <View style={styles.detailErrorCard}>
                          <Text style={styles.errorText}>{detailError}</Text>
                        </View>
                      )}

                      {periodDetail && !detailLoading && periodDetail.periodId === period.id && (
                        <>
                          {periodDetail.services.length === 0 ? (
                            <Text style={styles.detailEmptyText}>
                              No hay servicios registrados en este período.
                            </Text>
                          ) : (
                            <>
                              <View style={styles.detailTableHeader}>
                                <Text style={[styles.detailHeaderCell, { flex: 2 }]}>Descripción</Text>
                                <Text style={[styles.detailHeaderCell, { flex: 1, textAlign: "right" }]}>Neto</Text>
                              </View>
                              {periodDetail.services.map((line) => (
                                <View
                                  key={line.serviceExecutionId}
                                  style={styles.detailRow}
                                  testID={`nurse-payroll-service-line-${line.serviceExecutionId}`}
                                  nativeID={`nurse-payroll-service-line-${line.serviceExecutionId}`}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.detailServiceDate}>{formatDateES(line.serviceDate)}</Text>
                                    <Text style={styles.detailServiceDesc} numberOfLines={2}>
                                      {line.description}
                                    </Text>
                                    <View style={styles.detailAmountsRow}>
                                      <Text style={styles.detailAmountLabel}>
                                        Base: {formatCurrency(line.baseCompensation)}
                                      </Text>
                                      {line.transportIncentive > 0 && (
                                        <Text style={styles.detailAmountLabel}>
                                          Transporte: {formatCurrency(line.transportIncentive)}
                                        </Text>
                                      )}
                                      {line.complexityBonus > 0 && (
                                        <Text style={styles.detailAmountLabel}>
                                          Complejidad: {formatCurrency(line.complexityBonus)}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                  <Text style={styles.detailNetAmount}>
                                    {formatCurrency(line.netCompensation)}
                                  </Text>
                                </View>
                              ))}
                            </>
                          )}

                          <Pressable
                            style={[styles.voucherButton, downloadingVoucher && styles.voucherButtonDisabled]}
                            onPress={() => handleDownloadVoucher(period.id)}
                            disabled={downloadingVoucher}
                            testID={`nurse-payroll-download-voucher-${period.id}`}
                            nativeID={`nurse-payroll-download-voucher-${period.id}`}
                            accessibilityRole="button"
                            accessibilityLabel="Descargar comprobante"
                          >
                            {downloadingVoucher ? (
                              <ActivityIndicator
                                size="small"
                                color={designTokens.color.ink.inverse}
                                accessibilityLabel="Cargando..."
                              />
                            ) : (
                              <Text style={styles.voucherButtonText}>Descargar comprobante</Text>
                            )}
                          </Pressable>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollPad: { paddingTop: designTokens.spacing.xs, paddingBottom: designTokens.spacing.xl },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: designTokens.spacing.xxl,
  },
  heroCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
    gap: designTokens.spacing.xs,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: designTokens.color.ink.muted,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: "900",
    color: designTokens.color.status.successText,
    marginTop: designTokens.spacing.xs,
  },
  heroPeriod: {
    fontSize: 14,
    color: designTokens.color.ink.secondary,
  },
  section: { marginBottom: designTokens.spacing.xxl },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.md,
  },
  emptyText: { fontSize: 14, color: designTokens.color.ink.muted },
  emptyHint: {
    fontSize: 14,
    color: designTokens.color.ink.muted,
    textAlign: "center",
    paddingVertical: designTokens.spacing.lg,
  },
  historyGroup: { marginBottom: designTokens.spacing.md },
  historyItem: {
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.md,
    gap: designTokens.spacing.xs,
  },
  historyItemExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: designTokens.color.surface.accent,
    borderColor: designTokens.color.border.accent,
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  historyDate: { fontSize: 15, fontWeight: "700", color: designTokens.color.ink.primary },
  historyInfo: { fontSize: 12, color: designTokens.color.ink.muted },
  historyAmount: { fontSize: 16, fontWeight: "700", color: designTokens.color.status.successText },
  expandIndicator: {
    fontSize: 12,
    fontWeight: "600",
    color: designTokens.color.ink.accentStrong,
    marginTop: designTokens.spacing.xs,
  },
  errorCard: {
    backgroundColor: designTokens.color.surface.danger,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    marginBottom: designTokens.spacing.lg,
  },
  errorText: { color: designTokens.color.status.dangerText, fontSize: 13 },
  detailContainer: {
    backgroundColor: designTokens.color.surface.accent,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: designTokens.color.border.accent,
    borderBottomLeftRadius: designTokens.radius.md,
    borderBottomRightRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
  },
  detailLoader: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  detailLoaderText: { marginLeft: 8, fontSize: 13, color: designTokens.color.ink.secondary },
  detailErrorCard: {
    backgroundColor: designTokens.color.surface.danger,
    padding: 10,
    borderRadius: 6,
  },
  detailEmptyText: {
    fontSize: 13,
    color: designTokens.color.ink.muted,
    textAlign: "center",
    paddingVertical: 12,
  },
  detailTableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.strong,
    marginBottom: 4,
  },
  detailHeaderCell: {
    fontSize: 11,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  detailServiceDate: { fontSize: 11, color: designTokens.color.ink.muted, marginBottom: 2 },
  detailServiceDesc: { fontSize: 13, color: designTokens.color.ink.primary, fontWeight: "500" },
  detailAmountsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  detailAmountLabel: { fontSize: 11, color: designTokens.color.ink.secondary },
  detailNetAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: designTokens.color.status.successText,
    minWidth: 80,
    textAlign: "right",
  },
  voucherButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  voucherButtonDisabled: { opacity: 0.6 },
  voucherButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "700",
    fontSize: 14,
  },
});
