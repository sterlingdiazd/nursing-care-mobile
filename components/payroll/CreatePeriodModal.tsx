import { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { DateField } from "@/src/components/form";
import { nextQuincenaAfter, stepQuincena, rangesOverlap } from "@/src/utils/payrollPeriods";
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
      const nextSchedule = nextQuincenaAfter(existingPeriods);
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const end = new Date(`${v}T00:00:00`);
      const cut = new Date(end);
      cut.setDate(end.getDate() - 2);
      setCutoffDate(toIso(cut));
      setPaymentDate(toIso(end));
    }
  };

  const allFilled = startDate.length >= 8 && endDate.length >= 8 && cutoffDate.length >= 8 && paymentDate.length >= 8;
  const datesInOrder = startDate <= endDate && startDate <= cutoffDate && cutoffDate <= paymentDate;
  const dateOrderError = allFilled && !datesInOrder
    ? "Revisa el orden de las fechas: inicio ≤ corte ≤ pago, y fin igual o posterior al inicio."
    : null;
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
          <TouchableOpacity style={styles.quincenaBtn} onPress={() => applySchedule(stepQuincena(startDate, -1))} accessibilityRole="button" accessibilityLabel="Quincena anterior">
            <Text style={styles.quincenaBtnText}>◀ Quincena</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quincenaBtn} onPress={() => applySchedule(nextQuincenaAfter(existingPeriods))} accessibilityRole="button" accessibilityLabel="Restablecer a la quincena estándar siguiente">
            <Text style={styles.quincenaBtnText}>Estándar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quincenaBtn} onPress={() => applySchedule(stepQuincena(startDate, 1))} accessibilityRole="button" accessibilityLabel="Quincena siguiente">
            <Text style={styles.quincenaBtnText}>Quincena ▶</Text>
          </TouchableOpacity>
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
});
