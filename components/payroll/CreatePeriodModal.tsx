import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { DateField } from "@/src/components/form";

interface PeriodScheduleValue {
  startDate: string;
  endDate: string;
  cutoffDate: string;
  paymentDate: string;
}

interface CreatePeriodModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: PeriodScheduleValue) => Promise<void>;
  /** When provided, the modal edits this period's dates instead of creating a new one. */
  period?: PeriodScheduleValue | null;
}

export function CreatePeriodModal({ visible, onClose, onSubmit, period }: CreatePeriodModalProps) {
  const isEdit = Boolean(period);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the period being edited each time the sheet opens (create = blank).
  useEffect(() => {
    if (!visible) return;
    setStartDate(period?.startDate ?? "");
    setEndDate(period?.endDate ?? "");
    setCutoffDate(period?.cutoffDate ?? "");
    setPaymentDate(period?.paymentDate ?? "");
    setError(null);
  }, [visible, period]);

  const allFilled = startDate.length >= 8 &&
                 endDate.length >= 8 &&
                 cutoffDate.length >= 8 &&
                 paymentDate.length >= 8;
  // ISO yyyy-MM-dd compares correctly as strings: start ≤ end, start ≤ corte, corte ≤ pago.
  const datesInOrder = startDate <= endDate && startDate <= cutoffDate && cutoffDate <= paymentDate;
  const dateOrderError = allFilled && !datesInOrder
    ? "Revisa el orden de las fechas: inicio ≤ corte ≤ pago, y fin igual o posterior al inicio."
    : null;
  const isValid = allFilled && datesInOrder;

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setCutoffDate("");
    setPaymentDate("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        startDate,
        endDate,
        cutoffDate,
        paymentDate,
      });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : (isEdit ? "Error al actualizar el período" : "Error al crear el período"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cancelar creación de período"
          >
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? "Editar Período" : "Nuevo Período"}</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || loading}
            accessibilityRole="button"
            accessibilityLabel={
              loading
                ? (isEdit ? "Guardando período" : "Creando período")
                : (isEdit ? "Guardar período de nómina" : "Crear período de nómina")
            }
            accessibilityState={{ busy: loading, disabled: !isValid || loading }}
          >
            <Text style={[
              styles.submitButton,
              (!isValid || loading) && styles.submitButtonDisabled
            ]}>
              {loading ? (isEdit ? "Guardando..." : "Creando...") : (isEdit ? "Guardar" : "Crear")}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!error && dateOrderError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{dateOrderError}</Text>
            </View>
          )}

          <DateField
            label="Fecha de Inicio"
            value={startDate}
            onChange={setStartDate}
            testID="period-start-date"
            accessibilityLabel="Fecha de inicio del período"
          />

          <DateField
            label="Fecha de Fin"
            value={endDate}
            onChange={setEndDate}
            testID="period-end-date"
            accessibilityLabel="Fecha de fin del período"
          />

          <DateField
            label="Fecha de Corte"
            value={cutoffDate}
            onChange={setCutoffDate}
            testID="period-cutoff-date"
            accessibilityLabel="Fecha de corte del período"
          />

          <DateField
            label="Fecha de Pago"
            value={paymentDate}
            onChange={setPaymentDate}
            testID="period-payment-date"
            accessibilityLabel="Fecha de pago del período"
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.color.surface.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  cancelButton: {
    fontSize: 16,
    color: designTokens.color.ink.muted,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  submitButton: {
    fontSize: 16,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "700",
  },
  submitButtonDisabled: {
    color: designTokens.color.border.strong,
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  errorCard: {
    backgroundColor: designTokens.color.surface.danger,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.lg,
  },
  errorText: {
    color: designTokens.color.status.dangerText,
    fontSize: 14,
  },
});
