import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { getAdminMobilePayrollSummary, type AdminMobilePayrollSummaryDto } from "@/src/services/payrollService";

export default function AdminPayrollScreen() {
  const { roles } = useAuth();
  
  const [summary, setSummary] = useState<AdminMobilePayrollSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAdminMobilePayrollSummary();
        setSummary(data);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
        title="Resumen de Nomina"
        description="Monitorea los períodos y compensaciones"
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
      title="Resumen de Nomina"
      description="Monitorea los períodos y compensaciones"
    >
      <ScrollView style={styles.container}>
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary?.openPeriodsCount || 0}</Text>
            <Text style={styles.statLabel}>Abiertos</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary?.closedPeriodsCount || 0}</Text>
            <Text style={styles.statLabel}>Cerrados</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary?.activeNursesCount || 0}</Text>
            <Text style={styles.statLabel}>Enfermeras</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compensación del Período Actual</Text>
          <Text style={styles.amount}>
            {formatCurrency(summary?.totalCompensationCurrentPeriod || 0)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Períodos Recientes</Text>
          
          {summary?.recentPeriods && summary.recentPeriods.length > 0 ? (
            summary.recentPeriods.map((period: AdminMobilePayrollSummaryDto["recentPeriods"][number]) => (
              <TouchableOpacity 
                key={period.id} 
                style={styles.periodItem}
              >
                <View>
                  <Text style={styles.periodDate}>
                    {period.startDate} - {period.endDate}
                  </Text>
                  <Text style={styles.periodInfo}>
                    {period.lineCount} servicios
                  </Text>
                </View>
                <Text style={[
                  styles.periodStatus,
                  period.status === "Open" ? styles.statusOpen : styles.statusClosed
                ]}>
                  {period.status === "Open" ? "Abierto" : "Cerrado"}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.card}>
              <Text>No hay períodos recientes.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push("/admin/action-items" as any)}
          >
            <Text style={styles.buttonText}>Ir a Acciones</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  statsGrid: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  statCard: { flex: 1, backgroundColor: "#f5f5f5", padding: 12, borderRadius: 8, marginHorizontal: 4, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#1976d2" },
  statLabel: { fontSize: 10, textAlign: "center", color: "#666" },
  amount: { fontSize: 32, fontWeight: "bold", color: "#2e7d32" },
  card: { backgroundColor: "#f5f5f5", padding: 12, borderRadius: 8 },
  periodItem: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
  },
  periodDate: { fontSize: 14, fontWeight: "500" },
  periodInfo: { fontSize: 12, color: "#666" },
  periodStatus: { fontSize: 12, fontWeight: "500", alignSelf: "center" },
  statusOpen: { color: "#1976d2" },
  statusClosed: { color: "#666" },
  button: { backgroundColor: "#1976d2", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  errorCard: { backgroundColor: "#fee2e2", padding: 12, borderRadius: 8, margin: 16 },
  errorText: { color: "#991b1b" },
});