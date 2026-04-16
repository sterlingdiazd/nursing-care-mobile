import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { getNursePayrollSummary, getNursePayrollHistory, type NursePayrollSummaryDto, type PayrollPeriodListItemDto } from "@/src/services/payrollService";

export default function NursePayrollScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId?: string }>();
  const { userId: authUserId } = useAuth();
  
  const [summary, setSummary] = useState<NursePayrollSummaryDto | null>(null);
  const [history, setHistory] = useState<PayrollPeriodListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          getNursePayrollHistory(nurseId)
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
          <Text style={styles.sectionTitle}>Resumen del Período Actual</Text>
          
          {summary?.currentPeriodId ? (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Período</Text>
                <Text style={styles.value}>
                  {summary.currentPeriodStartDate} - {summary.currentPeriodEndDate}
                </Text>
              </View>
              
              <View style={styles.card}>
                <Text style={styles.label}>Estado</Text>
                <Text style={styles.value}>{summary.currentPeriodStatus}</Text>
              </View>
              
              <View style={styles.card}>
                <Text style={styles.label}>Compensación Total</Text>
                <Text style={[styles.value, styles.highlight]}>
                  {formatCurrency(summary.totalCompensationThisPeriod)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.card}>
              <Text>No hay período de nómina activo.</Text>
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
              <View key={period.id} style={styles.historyItem}>
                <View>
                  <Text style={styles.historyDate}>
                    {period.startDate} - {period.endDate}
                  </Text>
                  <Text style={styles.historyInfo}>
                    {period.totalNurses} servicios
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[
                    styles.historyStatus,
                    period.status === "Open" ? styles.statusOpen : styles.statusClosed
                  ]}>
                    {period.status === "Open" ? "Abierto" : "Cerrado"}
                  </Text>
                  <Text style={styles.historyAmount}>
                    {formatCurrency(period.totalCompensation)}
                  </Text>
                </View>
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
    marginBottom: 8,
  },
  historyDate: { fontSize: 14, fontWeight: "500" },
  historyInfo: { fontSize: 12, color: "#666" },
  historyRight: { alignItems: "flex-end" },
  historyStatus: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  statusOpen: { color: "#1976d2" },
  statusClosed: { color: "#666" },
  historyAmount: { fontSize: 14, fontWeight: "500", color: "#2e7d32" },
  errorCard: { backgroundColor: "#fee2e2", padding: 12, borderRadius: 8, margin: 16 },
  errorText: { color: "#991b1b" },
});