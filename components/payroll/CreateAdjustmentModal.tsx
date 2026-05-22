import { useCallback, useEffect, useState } from "react";
import type { CreateCompensationAdjustmentRequest } from "@/src/services/payrollService";
import {
  getPayrollPeriods,
  getPayrollPeriodById,
} from "@/src/services/payrollService";
import type { AdminPayrollPeriodListItem, AdminPayrollLineItem } from "@/src/services/payrollService";
import { useAuth } from "@/src/context/AuthContext";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { formatDOP } from "@/src/utils/currency";
import {
  FormModalScaffold,
  FormCard,
  Field,
  SelectRow,
  TextField,
  SummaryBanner,
  PickerSheet,
  PickerOption,
  PickerEmpty,
} from "@/components/payroll/FormModalScaffold";

interface CreateAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompensationAdjustmentRequest) => Promise<void>;
}

type PickerStep = "period" | "line" | null;

export function CreateAdjustmentModal({ visible, onClose, onSubmit }: CreateAdjustmentModalProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [periods, setPeriods] = useState<AdminPayrollPeriodListItem[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<AdminPayrollPeriodListItem | null>(null);
  const [periodLines, setPeriodLines] = useState<AdminPayrollLineItem[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [selectedLine, setSelectedLine] = useState<AdminPayrollLineItem | null>(null);
  const [activePicker, setActivePicker] = useState<PickerStep>(null);

  const { isReady, isAuthenticated } = useAuth();

  const resetForm = useCallback(() => {
    setLabel("");
    setAmount("");
    setError(null);
    setSelectedPeriod(null);
    setPeriodLines([]);
    setSelectedLine(null);
    setActivePicker(null);
  }, []);

  useEffect(() => {
    if (!visible) return;
    resetForm();
    if (!isReady || !isAuthenticated) return;

    let cancelled = false;
    setOptionsLoading(true);
    getPayrollPeriods({ pageNumber: 1, pageSize: 50 })
      .then((result) => { if (!cancelled) setPeriods(result.items); })
      .catch(() => { if (!cancelled) setError("No se pudieron cargar los períodos."); })
      .finally(() => { if (!cancelled) setOptionsLoading(false); });

    return () => { cancelled = true; };
  }, [visible, isReady, isAuthenticated, resetForm]);

  const handleSelectPeriod = useCallback(async (period: AdminPayrollPeriodListItem) => {
    setSelectedPeriod(period);
    setSelectedLine(null);
    setPeriodLines([]);
    setActivePicker(null);
    setLinesLoading(true);
    try {
      const detail = await getPayrollPeriodById(period.id);
      setPeriodLines(detail.lines);
    } catch {
      setError("No se pudieron cargar las líneas del período.");
    } finally {
      setLinesLoading(false);
    }
    setActivePicker("line");
  }, []);

  const handleSelectLine = useCallback((line: AdminPayrollLineItem) => {
    setSelectedLine(line);
    setActivePicker(null);
  }, []);

  const periodLabel = (p: AdminPayrollPeriodListItem) => `${formatDateES(p.startDate)} – ${formatDateES(p.endDate)}`;

  const parsedAmount = parseFloat(amount);
  const isValid = label.trim().length > 0 && parsedAmount !== 0 && !isNaN(parsedAmount) && selectedLine !== null;

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async () => {
    if (!isValid || !selectedLine) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ label: label.trim(), amount: parsedAmount, serviceExecutionId: selectedLine.serviceExecutionId });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el ajuste");
    } finally {
      setLoading(false);
    }
  };

  const parseAmount = (text: string): string => text.replace(/[^0-9.-]/g, "");
  const hasAmount = amount.length > 0 && !isNaN(parsedAmount);

  return (
    <FormModalScaffold
      visible={visible}
      onClose={handleClose}
      eyebrow="Nómina"
      title="Nuevo ajuste"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={loading ? "Creando..." : "Crear ajuste"}
      submitDisabled={!isValid}
      submitLoading={loading}
      submitTestID="adjustment-submit-button"
      overlays={
        <>
          <PickerSheet visible={activePicker === "period"} title="Selecciona un período" onClose={() => setActivePicker(null)}>
            {periods.length === 0 ? (
              <PickerEmpty text="No hay períodos disponibles." />
            ) : (
              periods.map((p) => (
                <PickerOption
                  key={p.id}
                  title={periodLabel(p)}
                  subtitle={`${p.lineCount} líneas`}
                  selected={selectedPeriod?.id === p.id}
                  badge={{ label: p.status === "Open" ? "Abierto" : "Cerrado", tone: p.status === "Open" ? "open" : "closed" }}
                  onPress={() => void handleSelectPeriod(p)}
                  testID={`adjustment-period-option-${p.id}`}
                  accessibilityLabel={`Seleccionar período ${periodLabel(p)}`}
                />
              ))
            )}
          </PickerSheet>

          <PickerSheet visible={activePicker === "line"} title="Selecciona una línea de servicio" onClose={() => setActivePicker(null)}>
            {linesLoading ? (
              <PickerEmpty text="Cargando líneas..." />
            ) : periodLines.length === 0 ? (
              <PickerEmpty text="Este período no tiene líneas." />
            ) : (
              periodLines.map((line) => (
                <PickerOption
                  key={line.id}
                  title={line.nurseDisplayName}
                  subtitle={line.description}
                  selected={selectedLine?.id === line.id}
                  onPress={() => handleSelectLine(line)}
                  testID={`adjustment-line-option-${line.id}`}
                  accessibilityLabel={`Seleccionar línea de ${line.nurseDisplayName}`}
                />
              ))
            )}
          </PickerSheet>
        </>
      }
    >
      <FormCard title="Servicio a ajustar">
        <Field label="Período de nómina" required>
          <SelectRow
            icon="calendar"
            value={selectedPeriod ? periodLabel(selectedPeriod) : null}
            placeholder="Selecciona un período"
            loading={optionsLoading}
            onPress={() => setActivePicker("period")}
            testID="adjustment-period-select"
            accessibilityLabel="Seleccionar período de nómina"
          />
        </Field>
        <Field label="Línea de servicio" required>
          <SelectRow
            icon="user-md"
            value={selectedLine?.nurseDisplayName}
            subtitle={selectedLine?.description}
            placeholder={selectedPeriod ? "Selecciona una línea" : "Primero selecciona un período"}
            loading={linesLoading}
            onPress={() => setActivePicker(selectedPeriod ? "line" : "period")}
            testID="adjustment-line-select"
            accessibilityLabel="Seleccionar línea de servicio"
          />
        </Field>
      </FormCard>

      <FormCard title="Detalle del ajuste">
        <Field label="Etiqueta" required>
          <TextField
            icon="tag"
            value={label}
            onChangeText={setLabel}
            placeholder="ej. Bonificación especial"
            autoCapitalize="words"
            testID="adjustment-label-input"
            nativeID="adjustment-label-input"
            accessibilityLabel="Etiqueta del ajuste"
          />
        </Field>
        <Field label="Monto" required hint="Positivo = bonificación · negativo = deducción">
          <TextField
            icon="money"
            prefix="RD$"
            emphasize
            value={amount}
            onChangeText={(text) => setAmount(parseAmount(text))}
            placeholder="500 o -500"
            keyboardType="decimal-pad"
            testID="adjustment-amount-input"
            nativeID="adjustment-amount-input"
            accessibilityLabel="Monto del ajuste, positivo para bonificación o negativo para deducción"
          />
        </Field>
      </FormCard>

      {hasAmount && parsedAmount !== 0 ? (
        <SummaryBanner
          label={parsedAmount >= 0 ? "Bonificación" : "Deducción"}
          value={`${parsedAmount >= 0 ? "+" : "−"}${formatDOP(Math.abs(parsedAmount))}`}
          tag={parsedAmount >= 0 ? "Suma" : "Resta"}
        />
      ) : null}
    </FormModalScaffold>
  );
}
