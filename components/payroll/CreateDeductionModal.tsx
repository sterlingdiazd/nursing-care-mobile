import { useState, useEffect, useMemo } from "react";
import type {
  CreateDeductionRequest,
  AdminPayrollPeriodListItem,
  AdminDeductionListItem,
  UpdateDeductionRequest,
} from "@/src/services/payrollService";
import { getPayrollPeriods } from "@/src/services/payrollService";
import { getAvailableNurses } from "@/src/services/catalogOptionsService";
import type { AvailableNurseOption } from "@/src/types/catalog";
import { useAuth } from "@/src/context/AuthContext";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { formatDOP } from "@/src/utils/currency";
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

interface CreateDeductionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeductionRequest) => Promise<void>;
  editingDeduction?: AdminDeductionListItem | null;
  onUpdate?: (id: string, data: UpdateDeductionRequest) => Promise<void>;
}

const DEDUCTION_TYPES = [
  { value: "Loan", label: "Préstamo" },
  { value: "Advance", label: "Adelanto" },
  { value: "Insurance", label: "Seguro" },
  { value: "Other", label: "Otro" },
];

type ActivePicker = "nurse" | "period" | null;

// A one-time deduction is a single payment. Labels that encode installments
// ("cuota 2 de 6", "1/4", ...) belong to a fixed plan (Descuentos Fijos).
const INSTALLMENT_PATTERN = /\bcuotas?\b|\d+\s*\/\s*\d+|\b\d+\s+de\s+\d+\b/i;
const looksLikeInstallment = (text: string) => INSTALLMENT_PATTERN.test(text);

export function CreateDeductionModal({
  visible,
  onClose,
  onSubmit,
  editingDeduction,
  onUpdate,
}: CreateDeductionModalProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [nurse, setNurse] = useState<AvailableNurseOption | null>(null);
  const [period, setPeriod] = useState<AdminPayrollPeriodListItem | null>(null);
  const [deductionType, setDeductionType] = useState("Other");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nurses, setNurses] = useState<AvailableNurseOption[]>([]);
  const [periods, setPeriods] = useState<AdminPayrollPeriodListItem[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [nurseQuery, setNurseQuery] = useState("");

  const { isReady, isAuthenticated } = useAuth();

  const isEditMode = editingDeduction != null;

  const resetForm = () => {
    setLabel("");
    setAmount("");
    setNurse(null);
    setPeriod(null);
    setDeductionType("Other");
    setError(null);
    setActivePicker(null);
    setNurseQuery("");
  };

  useEffect(() => {
    if (!visible) return;

    if (isEditMode && editingDeduction) {
      setLabel(editingDeduction.label);
      setAmount(String(editingDeduction.amount));
      setDeductionType(editingDeduction.deductionType);
      setNurse(null);
      setPeriod(null);
      setError(null);
      setActivePicker(null);
      setNurseQuery("");
      return;
    }

    resetForm();
    if (!isReady || !isAuthenticated) return;

    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      getAvailableNurses(),
      getPayrollPeriods({ pageNumber: 1, pageSize: 50 }),
    ])
      .then(([nurseList, periodResult]) => {
        if (cancelled) return;
        setNurses(nurseList);
        setPeriods(periodResult.items);
      })
      .catch(() => {
        if (cancelled) return;
        setError("No se pudieron cargar las enfermeras o los períodos.");
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, isReady, isAuthenticated, isEditMode]);

  const filteredNurses = useMemo(() => {
    const query = nurseQuery.trim().toLowerCase();
    if (!query) return nurses;
    return nurses.filter((n) =>
      [n.displayName, n.specialty, n.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    );
  }, [nurses, nurseQuery]);

  const isInstallmentLabel = looksLikeInstallment(label);
  const amountNum = parseFloat(amount);
  const isValid = !isInstallmentLabel && (isEditMode
    ? label.trim().length > 0 && amountNum > 0
    : label.trim().length > 0 && amountNum > 0 && nurse !== null);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      if (isEditMode && editingDeduction && onUpdate) {
        await onUpdate(editingDeduction.id, { label: label.trim(), amount: amountNum, deductionType });
      } else {
        if (!nurse) return;
        await onSubmit({
          label: label.trim(),
          amount: amountNum,
          nurseUserId: nurse.userId,
          payrollPeriodId: period?.id ?? undefined,
          deductionType,
        });
      }
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la deducción");
    } finally {
      setLoading(false);
    }
  };

  const parseAmount = (text: string): string => text.replace(/[^0-9.]/g, "");
  const nurseSubtitle = (n: AvailableNurseOption) => [n.specialty, n.category].filter(Boolean).join(" • ");
  const periodLabel = (p: AdminPayrollPeriodListItem) => `${formatDateES(p.startDate)} – ${formatDateES(p.endDate)}`;

  const typeLabel = DEDUCTION_TYPES.find((tpe) => tpe.value === deductionType)?.label ?? "";
  const title = isEditMode ? "Editar deducción" : "Nueva deducción única";
  const submitLabel = isEditMode ? (loading ? "Guardando..." : "Guardar deducción") : loading ? "Creando..." : "Crear deducción";

  return (
    <FormModalScaffold
      visible={visible}
      onClose={handleClose}
      eyebrow="Nómina"
      title={title}
      error={error}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      submitDisabled={!isValid}
      submitLoading={loading}
      submitTestID="deduction-submit-button"
      cancelTestID="deduction-cancel-button"
      overlays={!isEditMode ? (
        <>
          <PickerSheet
            visible={activePicker === "nurse"}
            title="Selecciona una enfermera"
            onClose={() => { setActivePicker(null); setNurseQuery(""); }}
          >
            <PickerSearchInput
              value={nurseQuery}
              onChangeText={setNurseQuery}
              placeholder="Buscar por nombre o especialidad"
              autoCapitalize="none"
              testID="deduction-nurse-search"
              nativeID="deduction-nurse-search"
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
                  onPress={() => { setNurse(n); setActivePicker(null); setNurseQuery(""); }}
                  testID={`deduction-nurse-option-${n.userId}`}
                  accessibilityLabel={`Seleccionar enfermera ${n.displayName}`}
                />
              ))
            )}
          </PickerSheet>

          <PickerSheet visible={activePicker === "period"} title="Selecciona un período" onClose={() => setActivePicker(null)}>
            <PickerOption
              title="Sin período"
              selected={period === null}
              onPress={() => { setPeriod(null); setActivePicker(null); }}
              testID="deduction-period-option-none"
              accessibilityLabel="Sin período"
            />
            {periods.length === 0 ? (
              <PickerEmpty text="No hay períodos disponibles." />
            ) : (
              periods.map((p) => (
                <PickerOption
                  key={p.id}
                  title={periodLabel(p)}
                  selected={period?.id === p.id}
                  badge={{ label: p.status === "Open" ? "Abierto" : "Cerrado", tone: p.status === "Open" ? "open" : "closed" }}
                  onPress={() => { setPeriod(p); setActivePicker(null); }}
                  testID={`deduction-period-option-${p.id}`}
                  accessibilityLabel={`Seleccionar período ${periodLabel(p)}`}
                />
              ))
            )}
          </PickerSheet>
        </>
      ) : null}
    >
      <FormCard title="Quién y concepto">
        {!isEditMode && (
          <Field label="Enfermera" required>
            <SelectRow
              icon="user-md"
              value={nurse?.displayName}
              subtitle={nurse ? nurseSubtitle(nurse) : null}
              placeholder="Selecciona una enfermera"
              loading={optionsLoading}
              onPress={() => setActivePicker("nurse")}
              testID="deduction-nurse-select"
              accessibilityLabel="Seleccionar enfermera"
            />
          </Field>
        )}
        <Field
          label="Etiqueta"
          required
          hint={isInstallmentLabel ? "Para descuentos en cuotas usa Descuentos Fijos. Esta pantalla es solo para descuentos de un solo pago." : undefined}
          hintError
        >
          <TextField
            icon="tag"
            value={label}
            onChangeText={setLabel}
            placeholder="ej. Seguro médico"
            autoCapitalize="words"
            testID="deduction-label-input"
            nativeID="deduction-label-input"
            accessibilityLabel="Etiqueta de la deducción"
          />
        </Field>
        <Field label="Tipo de deducción">
          <ChipGroup options={DEDUCTION_TYPES} value={deductionType} onChange={setDeductionType} testIDPrefix="deduction-type" />
        </Field>
      </FormCard>

      <FormCard title="Monto y período">
        <Field label="Monto" required>
          <TextField
            icon="money"
            prefix="RD$"
            emphasize
            value={amount}
            onChangeText={(text) => setAmount(parseAmount(text))}
            placeholder="1500"
            keyboardType="decimal-pad"
            testID="deduction-amount-input"
            nativeID="deduction-amount-input"
            accessibilityLabel="Monto de la deducción"
          />
        </Field>
        {!isEditMode && (
          <Field label="Período" optional>
            <SelectRow
              icon="calendar"
              value={period ? periodLabel(period) : null}
              placeholder="Sin período"
              loading={optionsLoading}
              onPress={() => setActivePicker("period")}
              testID="deduction-period-select"
              accessibilityLabel="Seleccionar período de nómina"
            />
          </Field>
        )}
      </FormCard>

      {amountNum > 0 ? <SummaryBanner label="Se descontará" value={formatDOP(amountNum)} tag={typeLabel} /> : null}
    </FormModalScaffold>
  );
}
