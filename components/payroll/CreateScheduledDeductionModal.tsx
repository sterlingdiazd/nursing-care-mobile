import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import type { CreateScheduledDeductionRequest } from "@/src/services/payrollTypes";
import { getAvailableNurses } from "@/src/services/catalogOptionsService";
import type { AvailableNurseOption } from "@/src/types/catalog";
import { useAuth } from "@/src/context/AuthContext";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import { DateField } from "@/src/components/form";

interface CreateScheduledDeductionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateScheduledDeductionRequest) => Promise<void>;
}

type DeductionType = "Loan" | "Advance" | "Insurance" | "Other";
type Modality = "Amortizing" | "RecurringFixed";
type Cadence = "Monthly" | "PerPeriod";

const CONCEPT_OPTIONS: { value: DeductionType; label: string }[] = [
  { value: "Loan", label: "Préstamo" },
  { value: "Advance", label: "Adelanto" },
  { value: "Insurance", label: "Seguro Médico" },
  { value: "Other", label: "Otro" },
];

const MODALITY_OPTIONS: { value: Modality; label: string }[] = [
  { value: "Amortizing", label: "Amortizable" },
  { value: "RecurringFixed", label: "Recurrente fija" },
];

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: "Monthly", label: "Mensual" },
  { value: "PerPeriod", label: "Quincenal" },
];

function defaultModalityForConcept(concept: DeductionType): Modality {
  if (concept === "Loan" || concept === "Advance") return "Amortizing";
  return "RecurringFixed";
}

function parseDecimal(text: string): string {
  return text.replace(/[^0-9.]/g, "");
}

function parseInteger(text: string): string {
  return text.replace(/[^0-9]/g, "");
}

interface PickerSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function PickerSheet({ visible, title, onClose, children }: PickerSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar selector" />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar selector">
            <Text style={styles.sheetClose}>Cerrar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

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

  // Amortizing fields
  const [capital, setCapital] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");

  // RecurringFixed fields
  const [recurringAmount, setRecurringAmount] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNurse(null);
    setNurseQuery("");
    setConcept("Loan");
    setModality("Amortizing");
    setCadence("Monthly");
    setLabel("");
    setStartPeriodDate("");
    setNotes("");
    setCapital("");
    setInterestRate("");
    setTotalInstallments("");
    setRecurringAmount("");
    setEndDate("");
    setMaxOccurrences("");
    setError(null);
    setShowNursePicker(false);
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
    if (!isReady || !isAuthenticated) return;

    let cancelled = false;
    setOptionsLoading(true);
    getAvailableNurses()
      .then((list) => {
        if (!cancelled) setNurses(list);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar las enfermeras.");
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, isReady, isAuthenticated]);

  // When concept changes, update modality default but allow user to override.
  const handleConceptChange = (newConcept: DeductionType) => {
    setConcept(newConcept);
    setModality(defaultModalityForConcept(newConcept));
  };

  const filteredNurses = useMemo(() => {
    const query = nurseQuery.trim().toLowerCase();
    if (!query) return nurses;
    return nurses.filter((n) =>
      [n.displayName, n.specialty, n.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    );
  }, [nurses, nurseQuery]);

  const isAmortizing = modality === "Amortizing";

  // Live preview for amortizing
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
    } else {
      const amt = parseFloat(recurringAmount);
      return isFinite(amt) && amt > 0;
    }
  }, [nurse, label, startPeriodDate, isAmortizing, capital, totalInstallments, recurringAmount]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

  const nurseSubtitle = (n: AvailableNurseOption) =>
    [n.specialty, n.category].filter(Boolean).join(" · ");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);

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
        testID={adminTestIds.payroll.scheduledModal.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            testID={adminTestIds.payroll.scheduledModal.cancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
          >
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo descuento fijo</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || loading}
            testID={adminTestIds.payroll.scheduledModal.submitButton}
            accessibilityRole="button"
            accessibilityLabel={loading ? "Creando" : "Crear"}
            accessibilityState={{ busy: loading, disabled: !isValid || loading }}
          >
            <Text style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}>
              {loading ? "Creando..." : "Crear"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Nurse picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Enfermera *</Text>
            <TouchableOpacity
              style={[styles.select, !nurse && styles.selectEmpty]}
              onPress={() => setShowNursePicker(true)}
              disabled={optionsLoading}
              testID={adminTestIds.payroll.scheduledModal.nurseSelect}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar enfermera"
            >
              {optionsLoading ? (
                <ActivityIndicator color={designTokens.color.ink.accent} />
              ) : nurse ? (
                <View style={styles.selectValueWrap}>
                  <Text style={styles.selectValue}>{nurse.displayName}</Text>
                  {nurseSubtitle(nurse) ? (
                    <Text style={styles.selectSubtitle}>{nurseSubtitle(nurse)}</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.selectPlaceholder}>Selecciona una enfermera</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Concepto */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Concepto *</Text>
            <View
              style={styles.segmented}
              testID={adminTestIds.payroll.scheduledModal.conceptSegmented}
              nativeID={adminTestIds.payroll.scheduledModal.conceptSegmented}
            >
              {CONCEPT_OPTIONS.map((opt) => {
                const selected = concept === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.segment, selected && styles.segmentSelected]}
                    onPress={() => handleConceptChange(opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Modalidad */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Modalidad *</Text>
            <View
              style={styles.segmented}
              testID={adminTestIds.payroll.scheduledModal.modalitySegmented}
              nativeID={adminTestIds.payroll.scheduledModal.modalitySegmented}
            >
              {MODALITY_OPTIONS.map((opt) => {
                const selected = modality === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.segment, selected && styles.segmentSelected]}
                    onPress={() => setModality(opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Cadencia */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cadencia</Text>
            <View
              style={styles.segmented}
              testID={adminTestIds.payroll.scheduledModal.cadenceSegmented}
              nativeID={adminTestIds.payroll.scheduledModal.cadenceSegmented}
            >
              {CADENCE_OPTIONS.map((opt) => {
                const selected = cadence === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.segment, selected && styles.segmentSelected]}
                    onPress={() => setCadence(opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Etiqueta */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Etiqueta *</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="ej. Préstamo personal"
              placeholderTextColor={designTokens.color.ink.muted}
              autoCapitalize="words"
              testID={adminTestIds.payroll.scheduledModal.labelInput}
              nativeID={adminTestIds.payroll.scheduledModal.labelInput}
              accessibilityLabel="Etiqueta del descuento fijo"
            />
          </View>

          {/* Fecha de inicio */}
          <DateField
            label="Inicio del período"
            required
            value={startPeriodDate}
            onChange={setStartPeriodDate}
            testID={adminTestIds.payroll.scheduledModal.startDateInput}
            accessibilityLabel="Fecha de inicio del período"
          />

          {/* Conditional fields: Amortizable */}
          {isAmortizing && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Capital *</Text>
                <View style={styles.amountField}>
                  <Text style={styles.amountAffix}>RD$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={capital}
                    onChangeText={(t) => setCapital(parseDecimal(t))}
                    placeholder="10000"
                    placeholderTextColor={designTokens.color.ink.muted}
                    keyboardType="decimal-pad"
                    testID={adminTestIds.payroll.scheduledModal.capitalInput}
                    nativeID={adminTestIds.payroll.scheduledModal.capitalInput}
                    accessibilityLabel="Capital del préstamo"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tasa de interés</Text>
                <View style={styles.amountField}>
                  <TextInput
                    style={styles.amountInput}
                    value={interestRate}
                    onChangeText={(t) => setInterestRate(parseDecimal(t))}
                    placeholder="0"
                    placeholderTextColor={designTokens.color.ink.muted}
                    keyboardType="decimal-pad"
                    testID={adminTestIds.payroll.scheduledModal.interestInput}
                    nativeID={adminTestIds.payroll.scheduledModal.interestInput}
                    accessibilityLabel="Tasa de interés en porcentaje"
                  />
                  <Text style={styles.amountAffix}>%</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}># de cuotas *</Text>
                <TextInput
                  style={styles.input}
                  value={totalInstallments}
                  onChangeText={(t) => setTotalInstallments(parseInteger(t))}
                  placeholder="12"
                  placeholderTextColor={designTokens.color.ink.muted}
                  keyboardType="number-pad"
                  testID={adminTestIds.payroll.scheduledModal.installmentsInput}
                  nativeID={adminTestIds.payroll.scheduledModal.installmentsInput}
                  accessibilityLabel="Número de cuotas"
                />
              </View>

              {/* Live preview */}
              {previewTotalRepayable != null && (
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Vista previa</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total a pagar:</Text>
                    <Text style={styles.previewValue}>{formatCurrency(previewTotalRepayable)}</Text>
                  </View>
                  {previewInstallment != null && (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Cuota estimada:</Text>
                      <Text style={styles.previewValue}>{formatCurrency(previewInstallment)}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* Conditional fields: Recurrente fija */}
          {!isAmortizing && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Monto *</Text>
                <View style={styles.amountField}>
                  <Text style={styles.amountAffix}>RD$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={recurringAmount}
                    onChangeText={(t) => setRecurringAmount(parseDecimal(t))}
                    placeholder="500"
                    placeholderTextColor={designTokens.color.ink.muted}
                    keyboardType="decimal-pad"
                    testID={adminTestIds.payroll.scheduledModal.recurringAmountInput}
                    nativeID={adminTestIds.payroll.scheduledModal.recurringAmountInput}
                    accessibilityLabel="Monto recurrente"
                  />
                </View>
              </View>

              <DateField
                label="Fecha de fin (opcional)"
                clearable
                value={endDate}
                onChange={setEndDate}
                testID={adminTestIds.payroll.scheduledModal.endDateInput}
                accessibilityLabel="Fecha de fin"
              />

              <View style={styles.inputGroup}>
                <Text style={styles.label}># máximo de ocurrencias (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={maxOccurrences}
                  onChangeText={(t) => setMaxOccurrences(parseInteger(t))}
                  placeholder="0"
                  placeholderTextColor={designTokens.color.ink.muted}
                  keyboardType="number-pad"
                  testID={adminTestIds.payroll.scheduledModal.maxOccurrencesInput}
                  nativeID={adminTestIds.payroll.scheduledModal.maxOccurrencesInput}
                  accessibilityLabel="Máximo de ocurrencias"
                />
              </View>
            </>
          )}

          {/* Notas */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observaciones adicionales"
              placeholderTextColor={designTokens.color.ink.muted}
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              testID={adminTestIds.payroll.scheduledModal.notesInput}
              nativeID={adminTestIds.payroll.scheduledModal.notesInput}
              accessibilityLabel="Notas adicionales"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Nurse picker sheet */}
      <PickerSheet
        visible={showNursePicker}
        title="Selecciona una enfermera"
        onClose={() => {
          setShowNursePicker(false);
          setNurseQuery("");
        }}
      >
        <TextInput
          style={styles.searchInput}
          value={nurseQuery}
          onChangeText={setNurseQuery}
          placeholder="Buscar por nombre o especialidad"
          placeholderTextColor={designTokens.color.ink.muted}
          autoCapitalize="none"
          testID={adminTestIds.payroll.scheduledModal.nurseSearch}
          nativeID={adminTestIds.payroll.scheduledModal.nurseSearch}
          accessibilityLabel="Buscar enfermera"
        />
        {filteredNurses.length === 0 ? (
          <Text style={styles.sheetEmpty}>No se encontraron enfermeras.</Text>
        ) : (
          filteredNurses.map((n) => {
            const selected = nurse?.userId === n.userId;
            return (
              <TouchableOpacity
                key={n.userId}
                style={styles.optionRow}
                onPress={() => {
                  setNurse(n);
                  setShowNursePicker(false);
                  setNurseQuery("");
                }}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar enfermera ${n.displayName}`}
                accessibilityState={{ selected }}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{n.displayName}</Text>
                  {nurseSubtitle(n) ? <Text style={styles.optionSubtitle}>{nurseSubtitle(n)}</Text> : null}
                </View>
                {selected && <Text style={styles.optionCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })
        )}
      </PickerSheet>
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
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  cancelButton: {
    fontSize: 16,
    color: designTokens.color.ink.muted,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
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
  },
  formContent: {
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.lg,
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
  inputGroup: {
    marginBottom: designTokens.spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: designTokens.color.ink.primary,
    backgroundColor: designTokens.color.surface.secondary,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.color.surface.secondary,
  },
  selectEmpty: {
    borderColor: designTokens.color.border.subtle,
  },
  selectValueWrap: {
    flex: 1,
  },
  selectValue: {
    fontSize: 16,
    color: designTokens.color.ink.primary,
    fontWeight: "600",
  },
  selectSubtitle: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
    marginTop: 2,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: designTokens.color.ink.muted,
  },
  chevron: {
    fontSize: 22,
    color: designTokens.color.ink.muted,
    marginLeft: designTokens.spacing.sm,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: designTokens.color.surface.tertiary,
    borderRadius: designTokens.radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: designTokens.radius.sm,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  segmentSelected: {
    backgroundColor: designTokens.color.ink.accentStrong,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    textAlign: "center",
  },
  segmentTextSelected: {
    color: designTokens.color.ink.inverse,
  },
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    backgroundColor: designTokens.color.surface.secondary,
  },
  amountAffix: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.muted,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: designTokens.spacing.sm,
    fontSize: 18,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
  },
  previewCard: {
    backgroundColor: designTokens.color.surface.accent,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xl,
    gap: 4,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 13,
    color: designTokens.color.ink.secondary,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  // Picker sheet
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 48, 68, 0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "75%",
    backgroundColor: designTokens.color.surface.primary,
    borderTopLeftRadius: designTokens.radius.xl,
    borderTopRightRadius: designTokens.radius.xl,
    paddingBottom: designTokens.spacing.xxl,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  sheetClose: {
    fontSize: 16,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "600",
  },
  sheetScroll: {
    paddingHorizontal: designTokens.spacing.lg,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: 10,
    fontSize: 15,
    color: designTokens.color.ink.primary,
    backgroundColor: designTokens.color.surface.secondary,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  sheetEmpty: {
    fontSize: 14,
    color: designTokens.color.ink.muted,
    paddingVertical: designTokens.spacing.xl,
    textAlign: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
    gap: designTokens.spacing.sm,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    flex: 1,
    fontSize: 16,
    color: designTokens.color.ink.primary,
    fontWeight: "600",
  },
  optionSubtitle: {
    fontSize: 12,
    color: designTokens.color.ink.muted,
    marginTop: 2,
  },
  optionCheck: {
    fontSize: 18,
    fontWeight: "700",
    color: designTokens.color.ink.accent,
  },
});
