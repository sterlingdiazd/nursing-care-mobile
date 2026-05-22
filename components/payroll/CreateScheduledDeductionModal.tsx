import { useState, useEffect, useMemo } from "react";
import type { CreateScheduledDeductionRequest } from "@/src/services/payrollTypes";
import { getAvailableNurses } from "@/src/services/catalogOptionsService";
import type { AvailableNurseOption } from "@/src/types/catalog";
import { useAuth } from "@/src/context/AuthContext";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import { DateField } from "@/src/components/form";
import {
  FormModalScaffold,
  FormCard,
  Field,
  SelectRow,
  TextField,
  ChipGroup,
  SummaryBanner,
  PickerSheet,
  PickerSearchInput,
  PickerOption,
  PickerEmpty,
} from "@/components/payroll/FormModalScaffold";

interface CreateScheduledDeductionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateScheduledDeductionRequest) => Promise<void>;
}

type DeductionType = "Loan" | "Advance" | "Insurance" | "Other";
type Modality = "Amortizing" | "RecurringFixed";
type Cadence = "Monthly" | "PerPeriod";

const CONCEPT_OPTIONS = [
  { value: "Loan", label: "Préstamo" },
  { value: "Advance", label: "Adelanto" },
  { value: "Insurance", label: "Seguro Médico" },
  { value: "Other", label: "Otro" },
];
const MODALITY_OPTIONS = [
  { value: "Amortizing", label: "Amortizable" },
  { value: "RecurringFixed", label: "Recurrente fija" },
];
const CADENCE_OPTIONS = [
  { value: "Monthly", label: "Mensual" },
  { value: "PerPeriod", label: "Quincenal" },
];

function defaultModalityForConcept(concept: DeductionType): Modality {
  if (concept === "Loan" || concept === "Advance") return "Amortizing";
  return "RecurringFixed";
}
const parseDecimal = (text: string): string => text.replace(/[^0-9.]/g, "");
const parseInteger = (text: string): string => text.replace(/[^0-9]/g, "");

export function CreateScheduledDeductionModal({ visible, onClose, onSubmit }: CreateScheduledDeductionModalProps) {
  const { isReady, isAuthenticated } = useAuth();

  const [nurse, setNurse] = useState<AvailableNurseOption | null>(null);
  const [nurses, setNurses] = useState<AvailableNurseOption[]>([]);
  const [nurseQuery, setNurseQuery] = useState("");
  const [showNursePicker, setShowNursePicker] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [concept, setConcept] = useState<DeductionType>("Loan");
  const [modality, setModality] = useState<Modality>("Amortizing");
  const [cadence, setCadence] = useState<Cadence>("Monthly");

  const [label, setLabel] = useState("");
  const [startPeriodDate, setStartPeriodDate] = useState("");
  const [notes, setNotes] = useState("");

  const [capital, setCapital] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");

  const [recurringAmount, setRecurringAmount] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNurse(null); setNurseQuery(""); setConcept("Loan"); setModality("Amortizing"); setCadence("Monthly");
    setLabel(""); setStartPeriodDate(""); setNotes(""); setCapital(""); setInterestRate(""); setTotalInstallments("");
    setRecurringAmount(""); setEndDate(""); setMaxOccurrences(""); setError(null); setShowNursePicker(false);
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
    if (!isReady || !isAuthenticated) return;
    let cancelled = false;
    setOptionsLoading(true);
    getAvailableNurses()
      .then((list) => { if (!cancelled) setNurses(list); })
      .catch(() => { if (!cancelled) setError("No se pudieron cargar las enfermeras."); })
      .finally(() => { if (!cancelled) setOptionsLoading(false); });
    return () => { cancelled = true; };
  }, [visible, isReady, isAuthenticated]);

  const handleConceptChange = (newConcept: DeductionType) => {
    setConcept(newConcept);
    setModality(defaultModalityForConcept(newConcept));
  };

  const filteredNurses = useMemo(() => {
    const query = nurseQuery.trim().toLowerCase();
    if (!query) return nurses;
    return nurses.filter((n) =>
      [n.displayName, n.specialty, n.category].filter(Boolean).some((field) => field.toLowerCase().includes(query)));
  }, [nurses, nurseQuery]);

  const isAmortizing = modality === "Amortizing";

  const previewTotalRepayable = useMemo(() => {
    const cap = parseFloat(capital);
    const rate = parseFloat(interestRate);
    if (!isFinite(cap) || cap <= 0) return null;
    if (!isFinite(rate) || rate < 0) return null;
    return cap * (1 + rate / 100);
  }, [capital, interestRate]);

  const previewInstallment = useMemo(() => {
    if (previewTotalRepayable == null) return null;
    const n = parseInt(totalInstallments, 10);
    if (!isFinite(n) || n <= 0) return null;
    return Math.round((previewTotalRepayable / n) * 100) / 100;
  }, [previewTotalRepayable, totalInstallments]);

  const isValid = useMemo(() => {
    if (!nurse) return false;
    if (!label.trim()) return false;
    if (!startPeriodDate.trim()) return false;
    if (isAmortizing) {
      const cap = parseFloat(capital);
      const inst = parseInt(totalInstallments, 10);
      return isFinite(cap) && cap > 0 && isFinite(inst) && inst > 0;
    }
    const amt = parseFloat(recurringAmount);
    return isFinite(amt) && amt > 0;
  }, [nurse, label, startPeriodDate, isAmortizing, capital, totalInstallments, recurringAmount]);

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async () => {
    if (!isValid || !nurse) return;
    setLoading(true);
    setError(null);
    try {
      const req: CreateScheduledDeductionRequest = {
        nurseUserId: nurse.userId,
        deductionType: concept,
        label: label.trim(),
        modality,
        cadence,
        startPeriodDate: startPeriodDate.trim(),
        notes: notes.trim() || undefined,
      };
      if (isAmortizing) {
        req.principalAmount = parseFloat(capital);
        req.interestRatePercent = parseFloat(interestRate) || 0;
        req.totalInstallments = parseInt(totalInstallments, 10);
      } else {
        req.recurringAmount = parseFloat(recurringAmount);
        if (endDate.trim()) req.endDate = endDate.trim();
        if (maxOccurrences.trim()) req.maxOccurrences = parseInt(maxOccurrences, 10);
      }
      await onSubmit(req);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el descuento fijo");
    } finally {
      setLoading(false);
    }
  };

  const nurseSubtitle = (n: AvailableNurseOption) => [n.specialty, n.category].filter(Boolean).join(" · ");
  const formatCurrency = (value: number) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
  const sm = adminTestIds.payroll.scheduledModal;

  return (
    <FormModalScaffold
      visible={visible}
      onClose={handleClose}
      eyebrow="Nómina"
      title="Nuevo descuento fijo"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={loading ? "Creando..." : "Crear descuento"}
      submitDisabled={!isValid}
      submitLoading={loading}
      submitTestID={sm.submitButton}
      cancelTestID={sm.cancelButton}
      overlays={
        <PickerSheet visible={showNursePicker} title="Selecciona una enfermera" onClose={() => { setShowNursePicker(false); setNurseQuery(""); }}>
          <PickerSearchInput
            value={nurseQuery}
            onChangeText={setNurseQuery}
            placeholder="Buscar por nombre o especialidad"
            autoCapitalize="none"
            testID={sm.nurseSearch}
            nativeID={sm.nurseSearch}
            accessibilityLabel="Buscar enfermera"
          />
          {filteredNurses.length === 0 ? (
            <PickerEmpty text="No se encontraron enfermeras." />
          ) : (
            filteredNurses.map((n) => (
              <PickerOption
                key={n.userId}
                title={n.displayName}
                subtitle={nurseSubtitle(n) || null}
                selected={nurse?.userId === n.userId}
                onPress={() => { setNurse(n); setShowNursePicker(false); setNurseQuery(""); }}
                accessibilityLabel={`Seleccionar enfermera ${n.displayName}`}
              />
            ))
          )}
        </PickerSheet>
      }
    >
      <FormCard title="Enfermera y concepto">
        <Field label="Enfermera" required>
          <SelectRow
            icon="user-md"
            value={nurse?.displayName}
            subtitle={nurse ? nurseSubtitle(nurse) : null}
            placeholder="Selecciona una enfermera"
            loading={optionsLoading}
            onPress={() => setShowNursePicker(true)}
            testID={sm.nurseSelect}
            accessibilityLabel="Seleccionar enfermera"
          />
        </Field>
        <Field label="Concepto" required>
          <ChipGroup options={CONCEPT_OPTIONS} value={concept} onChange={(v) => handleConceptChange(v as DeductionType)} containerTestID={sm.conceptSegmented} />
        </Field>
        <Field label="Modalidad" required>
          <ChipGroup options={MODALITY_OPTIONS} value={modality} onChange={(v) => setModality(v as Modality)} containerTestID={sm.modalitySegmented} />
        </Field>
        <Field label="Frecuencia">
          <ChipGroup options={CADENCE_OPTIONS} value={cadence} onChange={(v) => setCadence(v as Cadence)} containerTestID={sm.cadenceSegmented} />
        </Field>
      </FormCard>

      <FormCard title="Plan de pago">
        <Field label="Etiqueta" required>
          <TextField
            icon="tag"
            value={label}
            onChangeText={setLabel}
            placeholder="ej. Préstamo personal"
            autoCapitalize="words"
            testID={sm.labelInput}
            nativeID={sm.labelInput}
            accessibilityLabel="Etiqueta del descuento fijo"
          />
        </Field>
        <DateField
          label="Inicio del período"
          required
          value={startPeriodDate}
          onChange={setStartPeriodDate}
          testID={sm.startDateInput}
          accessibilityLabel="Fecha de inicio del período"
        />

        {isAmortizing ? (
          <>
            <Field label="Capital" required>
              <TextField icon="money" prefix="RD$" emphasize value={capital} onChangeText={(t) => setCapital(parseDecimal(t))} placeholder="10000" keyboardType="decimal-pad" testID={sm.capitalInput} nativeID={sm.capitalInput} accessibilityLabel="Capital del préstamo" />
            </Field>
            <Field label="Tasa de interés">
              <TextField suffix="%" value={interestRate} onChangeText={(t) => setInterestRate(parseDecimal(t))} placeholder="0" keyboardType="decimal-pad" testID={sm.interestInput} nativeID={sm.interestInput} accessibilityLabel="Tasa de interés en porcentaje" />
            </Field>
            <Field label="# de cuotas" required>
              <TextField value={totalInstallments} onChangeText={(t) => setTotalInstallments(parseInteger(t))} placeholder="12" keyboardType="number-pad" testID={sm.installmentsInput} nativeID={sm.installmentsInput} accessibilityLabel="Número de cuotas" />
            </Field>
          </>
        ) : (
          <>
            <Field label="Monto" required>
              <TextField icon="money" prefix="RD$" emphasize value={recurringAmount} onChangeText={(t) => setRecurringAmount(parseDecimal(t))} placeholder="500" keyboardType="decimal-pad" testID={sm.recurringAmountInput} nativeID={sm.recurringAmountInput} accessibilityLabel="Monto recurrente" />
            </Field>
            <DateField label="Fecha de fin (opcional)" clearable value={endDate} onChange={setEndDate} testID={sm.endDateInput} accessibilityLabel="Fecha de fin" />
            <Field label="# máximo de ocurrencias" optional>
              <TextField value={maxOccurrences} onChangeText={(t) => setMaxOccurrences(parseInteger(t))} placeholder="0" keyboardType="number-pad" testID={sm.maxOccurrencesInput} nativeID={sm.maxOccurrencesInput} accessibilityLabel="Máximo de ocurrencias" />
            </Field>
          </>
        )}
      </FormCard>

      <FormCard title="Notas">
        <Field label="Notas" optional>
          <TextField value={notes} onChangeText={setNotes} placeholder="Observaciones adicionales" autoCapitalize="sentences" multiline numberOfLines={3} testID={sm.notesInput} nativeID={sm.notesInput} accessibilityLabel="Notas adicionales" />
        </Field>
      </FormCard>

      {previewTotalRepayable != null ? (
        <SummaryBanner
          label={previewInstallment != null ? "Cuota estimada" : "Total a pagar"}
          value={formatCurrency(previewInstallment != null ? previewInstallment : previewTotalRepayable)}
          tag={previewInstallment != null ? `Total ${formatCurrency(previewTotalRepayable)}` : undefined}
        />
      ) : null}
    </FormModalScaffold>
  );
}
