import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
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

export default function NursePayrollScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId?: string }>();
  const { userId: authUserId } = useAuth();

  const [summary, setSummary] = useState<NursePayrollSummaryDto | null>(null);
  const [history, setHistory] = useState<PayrollPeriodListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null);
  const [periodDetail, setPeriodDetail] = useState<NursePayrollPeriodDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [downloadingVoucher, setDownloadingVoucher] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const nurseId = paramUserId || authUserId;
        if (!nurseId) {
          setError("No se pudo identificar al usuario");
          setLoading(false);
          return;
        }

        const [sum, hist] = await Promise.all([
          getNursePayrollSummary(nurseId),
          getNursePayrollHistory(nurseId),
        ]);

        setSummary(sum);
        setHistory(hist);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [paramUserId, authUserId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount);
  };

  const handlePeriodPress = async (periodId: string) => {
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
    setDownloadingVoucher(true);
    try {
      const session = getCachedAuthSession();
      const token = session?.token;
      if (!token) {
        Alert.alert("Error", "No hay sesion activa.");
        return;
      }
      const url = getNursePayrollVoucherUrl(periodId);
      const fileUri = (FileSystem as any).documentDirectory + `comprobante-${periodId}.pdf`;
      const downloadRes = await (FileSystem as any).downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          Alert.alert("Descarga", "Archivo descargado pero compartir no disponible.");
        }
      } else {
        Alert.alert("Error", "No fue posible descargar el comprobante.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", e instanceof Error ? e.message : "Error al descargar el comprobante.");
    } finally {
      setDownloadingVoucher(false);
    }
  };

  if (loading) {
    return (
      <MobileWorkspaceShell
        eyebrow="Nomina"
        title="Mi Nomina"
        description="Consulta tu balance y pagos recientes"
      >
        <View style={styles.container}>
          <Text>Cargando...</Text>
        </View>
      </MobileWorkspaceShell>
    );
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Nomina"
      title="Mi Nomina"
      description="Consulta tu balance y pagos recientes"
    >
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del Periodo Actual</Text>

          {summary?.currentPeriodId ? (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Periodo</Text>
                <Text style={styles.value}>
                  {summary.currentPeriodStartDate} - {summary.currentPeriodEndDate}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Estado</Text>
                <Text style={styles.value}>{summary.currentPeriodStatus}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Compensacion Total</Text>
                <Text style={[styles.value, styles.highlight]}>
                  {formatCurrency(summary.totalCompensationThisPeriod)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.card}>
              <Text>No hay periodo de nomina activo.</Text>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de Pagos</Text>

          {history.length === 0 ? (
            <View style={styles.card}>
              <Text>No hay historial de pagos.</Text>
            </View>
          ) : (
            history.map((period) => (
              <View key={period.id}>
                <Pressable
                  style={[
                    styles.historyItem,
                    expandedPeriodId === period.id && styles.historyItemExpanded,
                  ]}
                  onPress={() => handlePeriodPress(period.id)}
                  testID={`nurse-payroll-period-item-${period.id}`}
                >
                  <View>
                    <Text style={styles.historyDate}>
                      {period.startDate} - {period.endDate}
                    </Text>
                    <Text style={styles.historyInfo}>{period.totalNurses} servicios</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text
                      style={[
                        styles.historyStatus,
                        period.status === "Open" ? styles.statusOpen : styles.statusClosed,
                      ]}
                    >
                      {period.status === "Open" ? "Abierto" : "Cerrado"}
                    </Text>
                    <Text style={styles.historyAmount}>
                      {formatCurrency(period.totalCompensation)}
                    </Text>
                    <Text style={styles.expandIndicator}>
                      {expandedPeriodId === period.id ? "Ocultar detalle" : "Ver detalle"}
                    </Text>
                  </View>
                </Pressable>

                {expandedPeriodId === period.id && (
                  <View
                    style={styles.detailContainer}
                    testID={`nurse-payroll-period-detail-${period.id}`}
                  >
                    {detailLoading && (
                      <View style={styles.detailLoader}>
                        <ActivityIndicator size="small" color="#1976d2" />
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
                            No hay servicios registrados en este periodo.
                          </Text>
                        ) : (
                          <>
                            <View style={styles.detailTableHeader}>
                              <Text style={[styles.detailHeaderCell, { flex: 2 }]}>Descripcion</Text>
                              <Text style={[styles.detailHeaderCell, { flex: 1, textAlign: "right" }]}>Neto</Text>
                            </View>
                            {periodDetail.services.map((line) => (
                              <View
                                key={line.serviceExecutionId}
                                style={styles.detailRow}
                                testID={`nurse-payroll-service-line-${line.serviceExecutionId}`}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.detailServiceDate}>{line.serviceDate}</Text>
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
                        >
                          {downloadingVoucher ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.voucherButtonText}>Descargar comprobante</Text>
                          )}
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { marginBottom: 24, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  card: { backgroundColor: "#f5f5f5", padding: 12, borderRadius: 8, marginBottom: 8 },
  label: { fontSize: 12, color: "#666" },
  value: { fontSize: 16, fontWeight: "500" },
  highlight: { color: "#2e7d32", fontSize: 20 },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 0,
  },
  historyItemExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    backgroundColor: "#eef4ff",
  },
  historyDate: { fontSize: 14, fontWeight: "500" },
  historyInfo: { fontSize: 12, color: "#666" },
  historyRight: { alignItems: "flex-end" },
  historyStatus: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  statusOpen: { color: "#1976d2" },
  statusClosed: { color: "#666" },
  historyAmount: { fontSize: 14, fontWeight: "500", color: "#2e7d32" },
  expandIndicator: { fontSize: 11, color: "#1976d2", marginTop: 4 },
  errorCard: { backgroundColor: "#fee2e2", padding: 12, borderRadius: 8, margin: 16 },
  errorText: { color: "#991b1b" },
  // Detail expansion styles
  detailContainer: {
    backgroundColor: "#f0f4ff",
    borderTopWidth: 1,
    borderTopColor: "#c7d7f0",
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 12,
    marginBottom: 8,
  },
  detailLoader: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  detailLoaderText: { marginLeft: 8, fontSize: 13, color: "#555" },
  detailErrorCard: { backgroundColor: "#fee2e2", padding: 10, borderRadius: 6 },
  detailEmptyText: { fontSize: 13, color: "#666", textAlign: "center", paddingVertical: 12 },
  detailTableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#c7d7f0",
    marginBottom: 4,
  },
  detailHeaderCell: { fontSize: 11, fontWeight: "700", color: "#4a5568", textTransform: "uppercase" },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dce8fb",
  },
  detailServiceDate: { fontSize: 11, color: "#888", marginBottom: 2 },
  detailServiceDesc: { fontSize: 13, color: "#222", fontWeight: "500" },
  detailAmountsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  detailAmountLabel: { fontSize: 11, color: "#555" },
  detailNetAmount: { fontSize: 14, fontWeight: "700", color: "#2e7d32", minWidth: 80, textAlign: "right" },
  voucherButton: {
    backgroundColor: "#1976d2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  voucherButtonDisabled: { opacity: 0.6 },
  voucherButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
