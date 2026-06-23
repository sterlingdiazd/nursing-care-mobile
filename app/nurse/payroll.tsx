import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View, Text, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { NurseEarningsDashboard } from "@/src/components/payroll/NurseEarningsDashboard";
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
import { quincenaLabel } from "@/src/utils/payrollPeriods";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { IconBadge } from "@/src/components/shared/IconBadge";
import { hapticFeedback } from "@/src/utils/haptics";
import { isConnectivityError } from "@/src/services/httpClient";
import { readSnapshot, SnapshotBuckets, writeSnapshot } from "@/src/services/apiSnapshotCache";
import { OfflineSnapshotBanner } from "@/src/components/shared/OfflineSnapshotBanner";

function resolvePeriodId(period: any): string | null {
  const pid = period?.periodId ?? period?.id ?? period?.PeriodId ?? period?.Id ?? null;
  return pid === "undefined" || pid === "null" ? null : pid;
}

function resolveServiceCount(period: PayrollPeriodListItemDto): number {
  return period.serviceCount ?? period.totalNurses ?? 0;
}

function describeServiceLine(line: NursePayrollPeriodDetailDto["services"][number]): string {
  return line.description?.trim() || "Servicio realizado";
}

export default function NursePayrollScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId?: string }>();
  const { userId: authUserId, isReady, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<NursePayrollSummaryDto | null>(null);
  const [history, setHistory] = useState<PayrollPeriodListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Connectivity-resilience: when a real network failure prevents fetching
  // fresh payroll data, fall back to the last successful snapshot (summary +
  // history) so the screen renders real numbers behind an offline banner.
  const [isStale, setIsStale] = useState(false);
  const [staleCapturedAtUtc, setStaleCapturedAtUtc] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null);
  const [periodDetail, setPeriodDetail] = useState<NursePayrollPeriodDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [downloadingVoucher, setDownloadingVoucher] = useState(false);
  const fetchedForRef = useRef<string | null>(null);

  const loadPayrollData = useCallback(async (nurseId: string, isRetry: boolean): Promise<boolean> => {
    if (!isRetry) setLoading(true);
    try {
      const [sum, hist] = await Promise.all([
        getNursePayrollSummary(nurseId),
        getNursePayrollHistory(nurseId),
      ]);
      setSummary(sum);
      setHistory(hist);
      setError(null);
      setIsStale(false);
      setStaleCapturedAtUtc(null);
      void writeSnapshot(SnapshotBuckets.nursePayrollSummary, { summary: sum, history: hist });
      return true;
    } catch (e: unknown) {
      if (isConnectivityError(e)) {
        const cached = await readSnapshot<{
          summary: NursePayrollSummaryDto;
          history: PayrollPeriodListItemDto[];
        }>(SnapshotBuckets.nursePayrollSummary);
        if (cached) {
          setSummary(cached.data.summary);
          setHistory(cached.data.history);
          setIsStale(true);
          setStaleCapturedAtUtc(cached.capturedAtUtc);
          setError(null);
          return false;
        }
      }
      setError("No fue posible cargar la nómina. Inténtalo de nuevo.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

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

    void loadPayrollData(nurseId, false);
  }, [isReady, isAuthenticated, paramUserId, authUserId, loadPayrollData]);

  const onRetryPayroll = useCallback(async () => {
    if (isRetrying) return;
    const nurseId = paramUserId || authUserId;
    if (!nurseId) return;
    setIsRetrying(true);
    const ok = await loadPayrollData(nurseId, true);
    setIsRetrying(false);
    if (!ok && isStale) {
      showToast({ variant: "warning", message: "El API sigue sin responder. Mostrando últimos datos guardados." });
    }
  }, [authUserId, isRetrying, isStale, loadPayrollData, paramUserId, showToast]);

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
      setDetailError("No fue posible cargar el detalle del período.");
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
      showToast({ variant: "error", message: "No fue posible descargar el comprobante." });
    } finally {
      setDownloadingVoucher(false);
    }
  };

  const openCareRequestSource = (careRequestId?: string | null) => {
    if (!careRequestId) return;
    hapticFeedback.selection();
    router.push({ pathname: "/(tabs)/care-requests/[id]", params: { id: careRequestId } } as never);
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
        {isStale ? (
          <View style={styles.staleBannerWrap}>
            <OfflineSnapshotBanner
              capturedAtUtc={staleCapturedAtUtc ?? undefined}
              onRetry={onRetryPayroll}
              retrying={isRetrying}
              testID="nurse-payroll-offline-banner"
            />
          </View>
        ) : null}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {summary?.currentPeriodId ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroEyebrowRow}>
                <IconBadge icon="money" hue="green" size={30} iconSize={15} />
                <Text style={styles.heroEyebrow}>Período actual</Text>
              </View>
              <StatusBadge label={currentPeriodOpen ? "Abierto" : "Cerrado"} tone={currentPeriodOpen ? "success" : "neutral"} />
            </View>
            <Text style={styles.heroAmount}>
              {formatCurrency(summary.totalCompensationThisPeriod)}
            </Text>
            <Text style={styles.heroPeriod}>
              {summary.currentPeriodStartDate
                ? quincenaLabel(summary.currentPeriodStartDate, summary.currentPeriodEndDate ?? undefined)
                : ""}
            </Text>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <View style={styles.heroEyebrowRow}>
              <IconBadge icon="money" hue="green" size={30} iconSize={15} />
              <Text style={styles.heroEyebrow}>Período actual</Text>
            </View>
            <Text style={styles.emptyText}>No hay período de nómina activo.</Text>
          </View>
        )}

        {/* TODO: replace with real nurse payroll earnings API data */}
        <NurseEarningsDashboard
          data={[
            { date: "2026-05-01", amount: 1500 },
            { date: "2026-05-02", amount: 2200 },
            { date: "2026-05-03", amount: 0 },
            { date: "2026-05-04", amount: 1800 },
          ]}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <IconBadge icon="history" hue="blue" size={30} iconSize={15} />
            <Text style={styles.sectionTitle}>Historial de pagos</Text>
          </View>

          {history.length === 0 ? (
            <Text style={styles.emptyHint}>No hay historial de pagos.</Text>
          ) : (
            history.map((period, index) => {
              const periodId = resolvePeriodId(period);
              const serviceCount = resolveServiceCount(period);
              const isOpen = period.status === "Open";
              const isExpanded = Boolean(periodId && expandedPeriodId === periodId);
              return (
                <View key={periodId && periodId !== "undefined" ? periodId : `period-${index}`} style={styles.historyGroup}>
                  <Pressable
                    style={[styles.historyItem, isExpanded && styles.historyItemExpanded]}
                    onPress={() => {
                      if (periodId) void handlePeriodPress(periodId);
                    }}
                    disabled={!periodId}
                    testID={periodId ? `nurse-payroll-period-item-${periodId}` : undefined}
                    nativeID={periodId ? `nurse-payroll-period-item-${periodId}` : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={`${quincenaLabel(period.startDate, period.endDate)}, ${isOpen ? "abierto" : "cerrado"}`}
                    accessibilityState={{ disabled: !periodId, expanded: isExpanded }}
                  >
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyDate}>
                        {quincenaLabel(period.startDate, period.endDate)}
                      </Text>
                      <StatusBadge label={isOpen ? "Abierto" : "Cerrado"} tone={isOpen ? "success" : "neutral"} />
                    </View>
                    <View style={styles.historyBottomRow}>
                      <Text style={styles.historyInfo}>{serviceCount} servicios</Text>
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
                      testID={periodId ? `nurse-payroll-period-detail-${periodId}` : undefined}
                      nativeID={periodId ? `nurse-payroll-period-detail-${periodId}` : undefined}
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

                      {periodId && periodDetail && !detailLoading && periodDetail.periodId === periodId && (
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
                              {periodDetail.services.map((line, lineIndex) => {
                                const sId = line.serviceExecutionId ?? `line-${lineIndex}`;
                                const canOpenSource = Boolean(line.careRequestId);
                                return (
                                  <Pressable
                                    key={sId}
                                    style={({ pressed }) => [
                                      styles.detailRow,
                                      canOpenSource && styles.detailRowLinked,
                                      pressed && canOpenSource && styles.pressed,
                                    ]}
                                    onPress={() => openCareRequestSource(line.careRequestId)}
                                    disabled={!canOpenSource}
                                    testID={`nurse-payroll-service-line-${sId}`}
                                    nativeID={`nurse-payroll-service-line-${sId}`}
                                    accessibilityRole={canOpenSource ? "button" : undefined}
                                    accessibilityLabel={canOpenSource ? "Abrir solicitud que generó este pago" : undefined}
                                  >
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.detailServiceDate}>{formatDateES(line.serviceDate)}</Text>
                                      <Text style={styles.detailServiceDesc} numberOfLines={2}>
                                        {describeServiceLine(line)}
                                      </Text>
                                      <Text style={styles.detailSourceText}>
                                        Fuente: {canOpenSource ? "solicitud de cuidado" : "servicio registrado"}
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
                                    {canOpenSource ? <Text style={styles.detailChevron}>›</Text> : null}
                                  </Pressable>
                                );
                              })}
                            </>
                          )}

                          <Pressable
                            style={[styles.voucherButton, downloadingVoucher && styles.voucherButtonDisabled]}
                            onPress={() => handleDownloadVoucher(periodId)}
                            disabled={downloadingVoucher}
                            testID={`nurse-payroll-download-voucher-${periodId}`}
                            nativeID={`nurse-payroll-download-voucher-${periodId}`}
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
  staleBannerWrap: { marginBottom: designTokens.spacing.md },
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
  heroEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm,
  },
  heroEyebrow: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: designTokens.color.ink.muted,
  },
  heroAmount: {
    fontSize: designTokens.typography.display.fontSize,
    fontWeight: "900",
    color: designTokens.color.status.successText,
    marginTop: designTokens.spacing.xs,
  },
  heroPeriod: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.secondary,
  },
  section: { marginBottom: designTokens.spacing.xxl },
  sectionTitle: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.md,
  },
  emptyText: { fontSize: designTokens.typography.body.fontSize, color: designTokens.color.ink.muted },
  emptyHint: {
    fontSize: designTokens.typography.body.fontSize,
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
  historyDate: { fontSize: designTokens.typography.body.fontSize, fontWeight: "700", color: designTokens.color.ink.primary },
  historyInfo: { fontSize: designTokens.typography.caption.fontSize, color: designTokens.color.ink.muted },
  historyAmount: { fontSize: designTokens.typography.body.fontSize, fontWeight: "700", color: designTokens.color.status.successText },
  expandIndicator: {
    fontSize: designTokens.typography.caption.fontSize,
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
  errorText: { color: designTokens.color.status.dangerText, fontSize: designTokens.typography.label.fontSize },
  detailContainer: {
    backgroundColor: designTokens.color.surface.accent,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: designTokens.color.border.accent,
    borderBottomLeftRadius: designTokens.radius.md,
    borderBottomRightRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
  },
  detailLoader: { flexDirection: "row", alignItems: "center", paddingVertical: designTokens.spacing.sm },
  detailLoaderText: { marginLeft: designTokens.spacing.sm, fontSize: designTokens.typography.label.fontSize, color: designTokens.color.ink.secondary },
  detailErrorCard: {
    backgroundColor: designTokens.color.surface.danger,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
  },
  detailEmptyText: {
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.muted,
    textAlign: "center",
    paddingVertical: designTokens.spacing.md,
  },
  detailTableHeader: {
    flexDirection: "row",
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.strong,
    marginBottom: designTokens.spacing.xs,
  },
  detailHeaderCell: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  detailRowLinked: {
    paddingHorizontal: designTokens.spacing.sm,
    borderRadius: designTokens.radius.sm,
  },
  detailServiceDate: { fontSize: designTokens.typography.caption.fontSize, color: designTokens.color.ink.muted, marginBottom: designTokens.spacing.xs },
  detailServiceDesc: { fontSize: designTokens.typography.label.fontSize, color: designTokens.color.ink.primary, fontWeight: "500" },
  detailSourceText: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "700",
    marginTop: designTokens.spacing.xs,
  },
  detailAmountsRow: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm, marginTop: designTokens.spacing.xs },
  detailAmountLabel: { fontSize: designTokens.typography.caption.fontSize, color: designTokens.color.ink.secondary },
  detailNetAmount: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "700",
    color: designTokens.color.status.successText,
    minWidth: 80,
    textAlign: "right",
  },
  detailChevron: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "800",
    marginLeft: designTokens.spacing.xs,
    marginTop: -1,
  },
  pressed: { opacity: 0.76 },
  voucherButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    borderRadius: designTokens.radius.sm,
    alignItems: "center",
    marginTop: designTokens.spacing.md,
  },
  voucherButtonDisabled: { opacity: 0.6 },
  voucherButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "700",
    fontSize: designTokens.typography.body.fontSize,
  },
});
