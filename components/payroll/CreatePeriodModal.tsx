import { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { DateField } from "@/src/components/form";
import { nextQuincenaAfter, stepQuincena, rangesOverlap, quincenaHygieneWarnings, computeCutoffAndPayment, type PaymentDatePolicy } from "@/src/utils/payrollPeriods";
import { FormModalScaffold, FormCard } from "@/components/payroll/FormModalScaffold";
import { hapticFeedback } from "@/src/utils/haptics";

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
  period?: PeriodScheduleValue | null;
  existingPeriods?: ReadonlyArray<{ startDate: string; endDate: string }>;
  /** Admin-configured payment-date policy for the prefill; omit to keep the default behavior. */
  paymentPolicy?: PaymentDatePolicy;
}

export function CreatePeriodModal({ visible, onClose, onSubmit, period, existingPeriods = [], paymentPolicy }: CreatePeriodModalProps) {
  const isEdit = Boolean(period);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySchedule = (s: PeriodScheduleValue) => {
    hapticFeedback.selection();
    setStartDate(s.startDate);
    setEndDate(s.endDate);
    setCutoffDate(s.cutoffDate);
    setPaymentDate(s.paymentDate);
    setError(null);
  };

  useEffect(() => {
    if (!visible) return;
    if (period) {
      setStartDate(period.startDate ?? "");
      setEndDate(period.endDate ?? "");
      setCutoffDate(period.cutoffDate ?? "");
      setPaymentDate(period.paymentDate ?? "");
      setError(null);
    } else {
      const nextSchedule = nextQuincenaAfter(existingPeriods, paymentPolicy);
      setStartDate(nextSchedule.startDate);
      setEndDate(nextSchedule.endDate);
      setCutoffDate(nextSchedule.cutoffDate);
      setPaymentDate(nextSchedule.paymentDate);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, period]);

  const onEndChange = (v: string) => {
    setEndDate(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const { cutoffDate: nextCutoff, paymentDate: nextPayment } = computeCutoffAndPayment(startDate, v, paymentPolicy);
      setCutoffDate(nextCutoff);
      setPaymentDate(nextPayment);
    }
  };

  const allFilled = startDate.length >= 8 && endDate.length >= 8 && cutoffDate.length >= 8 && paymentDate.length >= 8;
  // Corte cae dentro del período (inicio ≤ corte ≤ fin) y pago ≥ corte — igual que el backend.
  const datesInOrder = startDate <= endDate && startDate <= cutoffDate && cutoffDate <= endDate && cutoffDate <= paymentDate;
  const dateOrderError = allFilled && !datesInOrder
    ? "Revisa el orden de las fechas: inicio ≤ corte ≤ fin, y pago igual o posterior al corte."
    : null;
  const overlapError = !isEdit && allFilled && datesInOrder &&
    existingPeriods.some((p) => rangesOverlap(startDate, endDate, p.startDate, p.endDate))
    ? "El período se solapa con un período existente. Usa el selector de quincena o ajusta las fechas."
    : null;
  const isValid = allFilled && datesInOrder && !overlapError;

  // Non-blocking calendar-hygiene advisories (alignment, length, gap). New periods only.
  const hygieneWarnings = !isEdit && allFilled && datesInOrder && !overlapError
    ? quincenaHygieneWarnings({ startDate, endDate, cutoffDate, paymentDate }, existingPeriods)
    : [];

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setCutoffDate("");
    setPaymentDate("");
    setError(null);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ startDate, endDate, cutoffDate, paymentDate });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : (isEdit ? "Error al actualizar el período" : "Error al crear el período"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModalScaffold
      visible={visible}
      onClose={handleClose}
      eyebrow="Nómina"
      title={isEdit ? "Editar período" : "Nuevo período"}
      error={error ?? dateOrderError ?? overlapError}
      onSubmit={handleSubmit}
      submitLabel={loading ? (isEdit ? "Guardando..." : "Creando...") : isEdit ? "Guardar período" : "Crear período"}
      submitDisabled={!isValid}
      submitLoading={loading}
    >
      {!isEdit && (
        <View style={styles.quincenaBar}>
          <TouchableOpacity style={styles.quincenaBtn} onPress={() => applySchedule(stepQuincena(startDate, -1, paymentPolicy))} accessibilityRole="button" accessibilityLabel="Quincena anterior">
            <Text style={styles.quincenaBtnText}>◀ Quincena</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quincenaBtn} onPress={() => applySchedule(nextQuincenaAfter(existingPeriods, paymentPolicy))} accessibilityRole="button" accessibilityLabel="Restablecer a la quincena estándar siguiente">
            <Text style={styles.quincenaBtnText}>Estándar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quincenaBtn} onPress={() => applySchedule(stepQuincena(startDate, 1, paymentPolicy))} accessibilityRole="button" accessibilityLabel="Quincena siguiente">
            <Text style={styles.quincenaBtnText}>Quincena ▶</Text>
          </TouchableOpacity>
        </View>
      )}

      {hygieneWarnings.length > 0 && (
        <View style={styles.hygieneCard} testID="period-hygiene-warnings">
          {hygieneWarnings.map((w, i) => (
            <Text key={i} style={styles.hygieneText}>• {w}</Text>
          ))}
        </View>
      )}

      <FormCard title="Fechas del período">
        <DateField label="Fecha de inicio" value={startDate} onChange={setStartDate} testID="period-start-date" accessibilityLabel="Fecha de inicio del período" />
        <DateField label="Fecha de fin" value={endDate} onChange={onEndChange} testID="period-end-date" accessibilityLabel="Fecha de fin del período" />
        <DateField label="Fecha de corte" value={cutoffDate} onChange={setCutoffDate} testID="period-cutoff-date" accessibilityLabel="Fecha de corte del período" />
        <DateField label="Fecha de pago" value={paymentDate} onChange={setPaymentDate} testID="period-payment-date" accessibilityLabel="Fecha de pago del período" />
      </FormCard>
    </FormModalScaffold>
  );
}

const styles = StyleSheet.create({
  quincenaBar: { flexDirection: "row", gap: 8, marginBottom: 14 },
  quincenaBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: designTokens.color.border.subtle, backgroundColor: designTokens.color.surface.primary, alignItems: "center" },
  quincenaBtnText: { fontSize: 13, fontWeight: "700", color: designTokens.color.ink.accentStrong },
  hygieneCard: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.warning,
    gap: 4,
  },
  hygieneText: {
    fontSize: 12,
    lineHeight: 17,
    color: designTokens.color.status.warningText,
    fontWeight: "600",
  },
});
