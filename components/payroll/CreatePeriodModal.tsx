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
import { nextQuincenaAfter, stepQuincena, rangesOverlap } from "@/src/utils/payrollPeriods";

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
  /** Existing periods, used to prefill the next quincena and warn about overlaps. */
  existingPeriods?: ReadonlyArray<{ startDate: string; endDate: string }>;
}

const toIso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function CreatePeriodModal({ visible, onClose, onSubmit, period, existingPeriods = [] }: CreatePeriodModalProps) {
  const isEdit = Boolean(period);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySchedule = (s: PeriodScheduleValue) => {
    setStartDate(s.startDate);
    setEndDate(s.endDate);
    setCutoffDate(s.cutoffDate);
    setPaymentDate(s.paymentDate);
    setError(null);
  };

  // On open: edit → the period's dates; create → the next standard quincena (context-aware).
  useEffect(() => {
    if (!visible) return;
    if (period) {
      setStartDate(period.startDate ?? "");
      setEndDate(period.endDate ?? "");
      setCutoffDate(period.cutoffDate ?? "");
      setPaymentDate(period.paymentDate ?? "");
      setError(null);
    } else {
      applySchedule(nextQuincenaAfter(existingPeriods));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, period]);

  // Changing the end date auto-derives cutoff (= end − 2) and payment (= end); both stay editable.
  const onEndChange = (v: string) => {
    setEndDate(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const end = new Date(`${v}T00:00:00`);
      const cut = new Date(end);
      cut.setDate(end.getDate() - 2);
      setCutoffDate(toIso(cut));
      setPaymentDate(toIso(end));
    }
  };

  const allFilled = startDate.length >= 8 &&
                 endDate.length >= 8 &&
                 cutoffDate.length >= 8 &&
                 paymentDate.length >= 8;
  // ISO yyyy-MM-dd compares correctly as strings: start ≤ end, start ≤ corte, corte ≤ pago.
  const datesInOrder = startDate <= endDate && startDate <= cutoffDate && cutoffDate <= paymentDate;
  const dateOrderError = allFilled && !datesInOrder
    ? "Revisa el orden de las fechas: inicio ≤ corte ≤ pago, y fin igual o posterior al inicio."
    : null;
  // Client-side overlap warning for new periods (the backend is authoritative).
  const overlapError = !isEdit && allFilled && datesInOrder &&
    existingPeriods.some((p) => rangesOverlap(startDate, endDate, p.startDate, p.endDate))
    ? "El período se solapa con un período existente. Usa el selector de quincena o ajusta las fechas."
    : null;
  const isValid = allFilled && datesInOrder && !overlapError;

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
          {!isEdit && (
            <View style={styles.quincenaBar}>
              <TouchableOpacity
                style={styles.quincenaBtn}
                onPress={() => applySchedule(stepQuincena(startDate, -1))}
                accessibilityRole="button"
                accessibilityLabel="Quincena anterior"
              >
                <Text style={styles.quincenaBtnText}>◀ Quincena</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quincenaBtn}
                onPress={() => applySchedule(nextQuincenaAfter(existingPeriods))}
                accessibilityRole="button"
                accessibilityLabel="Restablecer a la quincena estándar siguiente"
              >
                <Text style={styles.quincenaBtnText}>Estándar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quincenaBtn}
                onPress={() => applySchedule(stepQuincena(startDate, 1))}
                accessibilityRole="button"
                accessibilityLabel="Quincena siguiente"
              >
                <Text style={styles.quincenaBtnText}>Quincena ▶</Text>
              </TouchableOpacity>
            </View>
          )}

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

          {!error && !dateOrderError && overlapError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{overlapError}</Text>
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
            onChange={onEndChange}
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
  quincenaBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: designTokens.spacing.lg,
  },
  quincenaBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.secondary,
    alignItems: "center",
  },
  quincenaBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: designTokens.color.ink.accentStrong,
  },
});
