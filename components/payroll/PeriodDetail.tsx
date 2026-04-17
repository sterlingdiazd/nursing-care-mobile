import { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Share, Platform, Linking, ActivityIndicator } from "react-native";
import type { AdminPayrollPeriodDetail } from "@/src/services/payrollService";
import { getPayrollPeriodExportUrl } from "@/src/services/payrollService";

interface PeriodDetailProps {
  period: AdminPayrollPeriodDetail;
  onClose: () => Promise<void>;
  onBack: () => void;
}

export function PeriodDetail({ period, onClose, onBack }: PeriodDetailProps) {
  const isOpen = period.status === "Open";
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount);
  };

  const handleExport = async () => {
    const exportUrl = getPayrollPeriodExportUrl(period.id);
    setExporting(true);
    
    try {
      if (Platform.OS === "ios" || Platform.OS === "android") {
        Alert.alert(
          "Exportar Período",
          "¿Qué deseas hacer con el enlace de exportación?",
          [
            { 
              text: "Abrir en Navegador", 
              onPress: async () => {
                const canOpen = await Linking.canOpenURL(exportUrl);
                if (canOpen) {
                  await Linking.openURL(exportUrl);
                } else {
                  Alert.alert("Error", "No fue posible abrir el navegador");
                }
              }
            },
            { 
              text: "Compartir", 
              onPress: async () => {
                try {
                  await Share.share({
                    message: `Exportar período de nómina: ${exportUrl}`,
                    title: "Exportar Período",
                  });
                } catch {
                  Alert.alert("Error", "No fue posible compartilhar");
                }
              }
            },
            { text: "Cancelar", style: "cancel" },
          ]
        );
      } else {
        await Linking.openURL(exportUrl);
      }
    } catch (error) {
      Alert.alert("Error", "No fue posible exportar el período");
    } finally {
      setExporting(false);
    }
  };

  const handleClosePeriod = () => {
    Alert.alert(
      "Cerrar Período",
      `¿Estás seguro de cerrar el período "${period.startDate} - ${period.endDate}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Cerrar Período", 
          style: "destructive",
          onPress: async () => {
            try {
              await onClose();
            } catch (error) {
              Alert.alert("Error", "No fue posible cerrar el período");
            }
          }
        },
      ]
    );
  };

  const totalGross = period.staffSummary.reduce((sum, s) => sum + s.grossCompensation, 0);
  const totalNet = period.staffSummary.reduce((sum, s) => sum + s.netCompensation, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        
        <View style={styles.statusRow}>
          <Text style={styles.dates}>
            {period.startDate} - {period.endDate}
          </Text>
          <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
            <Text style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
              {isOpen ? "Abierto" : "Cerrado"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metaSection}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Corte</Text>
            <Text style={styles.metaValue}>{period.cutoffDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Pago</Text>
            <Text style={styles.metaValue}>{period.paymentDate}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Creado</Text>
            <Text style={styles.metaValue}>{period.createdAtUtc}</Text>
          </View>
          {period.closedAtUtc && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Cerrado</Text>
              <Text style={styles.metaValue}>{period.closedAtUtc}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Resumen Total</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Líneas</Text>
            <Text style={styles.summaryValue}>{period.lines.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Bruto</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalGross)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Neto</Text>
            <Text style={[styles.summaryValue, styles.summaryValueGreen]}>{formatCurrency(totalNet)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.staffSection}>
        <Text style={styles.sectionTitle}>Resumen por Enfermera ({period.staffSummary.length})</Text>
        
        {period.staffSummary.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay nurses en este período</Text>
          </View>
        ) : (
          period.staffSummary.map((staff) => (
            <View key={staff.nurseUserId} style={styles.staffItem}>
              <View style={styles.staffHeader}>
                <Text style={styles.staffName}>{staff.nurseDisplayName}</Text>
                <Text style={styles.staffNet}>{formatCurrency(staff.netCompensation)}</Text>
              </View>
              <View style={styles.staffDetails}>
                <Text style={styles.staffInfo}>{staff.lineCount} servicios</Text>
                <Text style={styles.staffInfo}>
                  Bruto: {formatCurrency(staff.grossCompensation)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.exportButtonText}>Exportar CSV</Text>
          )}
        </TouchableOpacity>
        
        {isOpen && (
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleClosePeriod}
          >
            <Text style={styles.closeButtonText}>Cerrar Período</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 15,
    color: "#1976d2",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dates: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  statusOpen: {
    backgroundColor: "#e3f2fd",
  },
  statusClosed: {
    backgroundColor: "#f5f5f5",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusTextOpen: {
    color: "#1976d2",
  },
  statusTextClosed: {
    color: "#666",
  },
  metaSection: {
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    color: "#333",
  },
  summarySection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  summaryValueGreen: {
    color: "#2e7d32",
  },
  staffSection: {
    padding: 16,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
  },
  staffItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  staffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  staffName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  staffNet: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  staffDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  staffInfo: {
    fontSize: 12,
    color: "#666",
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  exportButton: {
    backgroundColor: "#1976d2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});