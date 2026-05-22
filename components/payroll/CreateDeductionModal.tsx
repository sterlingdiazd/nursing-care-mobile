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

  const isValid = isEditMode
    ? label.trim().length > 0 && parseFloat(amount) > 0
    : label.trim().length > 0 && parseFloat(amount) > 0 && nurse !== null;

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
        const data: UpdateDeductionRequest = {
          label: label.trim(),
          amount: parseFloat(amount),
          deductionType,
        };
        await onUpdate(editingDeduction.id, data);
      } else {
        if (!nurse) return;
        const data: CreateDeductionRequest = {
          label: label.trim(),
          amount: parseFloat(amount),
          nurseUserId: nurse.userId,
          payrollPeriodId: period?.id ?? undefined,
          deductionType,
        };
        await onSubmit(data);
      }
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la deducción");
    } finally {
      setLoading(false);
    }
  };

  const parseAmount = (text: string): string => text.replace(/[^0-9.]/g, "");

  const nurseSubtitle = (n: AvailableNurseOption) =>
    [n.specialty, n.category].filter(Boolean).join(" • ");

  const periodLabel = (p: AdminPayrollPeriodListItem) => `${formatDateES(p.startDate)} – ${formatDateES(p.endDate)}`;

  const modalTitle = isEditMode ? "Editar deducción" : "Nueva deducción única";
  const submitLabel = isEditMode
    ? loading ? "Guardando..." : "Guardar"
    : loading ? "Creando..." : "Crear";
  const submitAccessibilityLabel = isEditMode
    ? loading ? "Guardando deducción" : "Guardar deducción"
    : loading ? "Creando deducción" : "Crear deducción";
  const cancelAccessibilityLabel = isEditMode
    ? "Cancelar edición de deducción"
    : "Cancelar creación de deducción";

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
            testID="deduction-cancel-button"
            accessibilityRole="button"
            accessibilityLabel={cancelAccessibilityLabel}
          >
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{modalTitle}</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || loading}
            testID="deduction-submit-button"
            accessibilityRole="button"
            accessibilityLabel={submitAccessibilityLabel}
            accessibilityState={{ busy: loading, disabled: !isValid || loading }}
          >
            <Text style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}>
              {submitLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!isEditMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Enfermera *</Text>
              <TouchableOpacity
                style={[styles.select, !nurse && styles.selectEmpty]}
                onPress={() => setActivePicker("nurse")}
                disabled={optionsLoading}
                testID="deduction-nurse-select"
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
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Etiqueta *</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="ej. Seguro médico"
              placeholderTextColor={designTokens.color.ink.muted}
              autoCapitalize="words"
              testID="deduction-label-input"
              nativeID="deduction-label-input"
              accessibilityLabel="Etiqueta de la deducción"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de deducción</Text>
            <View style={styles.segmented}>
              {DEDUCTION_TYPES.map((type) => {
                const selected = deductionType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.segment, selected && styles.segmentSelected]}
                    onPress={() => setDeductionType(type.value)}
                    testID={`deduction-type-${type.value.toLowerCase()}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Tipo de deducción: ${type.label}`}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto *</Text>
            <View style={styles.amountField}>
              <Text style={styles.amountAffix}>RD$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => setAmount(parseAmount(text))}
                placeholder="1500"
                placeholderTextColor={designTokens.color.ink.muted}
                keyboardType="decimal-pad"
                testID="deduction-amount-input"
                nativeID="deduction-amount-input"
                accessibilityLabel="Monto de la deducción"
              />
            </View>
          </View>

          {!isEditMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Período (opcional)</Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setActivePicker("period")}
                disabled={optionsLoading}
                testID="deduction-period-select"
                accessibilityRole="button"
                accessibilityLabel="Seleccionar período de nómina"
              >
                {optionsLoading ? (
                  <ActivityIndicator color={designTokens.color.ink.accent} />
                ) : period ? (
                  <Text style={styles.selectValue}>{periodLabel(period)}</Text>
                ) : (
                  <Text style={styles.selectPlaceholder}>Sin período</Text>
                )}
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {!isEditMode && (
        <>
          <PickerSheet
            visible={activePicker === "nurse"}
            title="Selecciona una enfermera"
            onClose={() => {
              setActivePicker(null);
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
              testID="deduction-nurse-search"
              nativeID="deduction-nurse-search"
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
                      setActivePicker(null);
                      setNurseQuery("");
                    }}
                    testID={`deduction-nurse-option-${n.userId}`}
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

          <PickerSheet
            visible={activePicker === "period"}
            title="Selecciona un período"
            onClose={() => setActivePicker(null)}
          >
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setPeriod(null);
                setActivePicker(null);
              }}
              testID="deduction-period-option-none"
              accessibilityRole="button"
              accessibilityLabel="Sin período"
              accessibilityState={{ selected: period === null }}
            >
              <Text style={styles.optionTitle}>Sin período</Text>
              {period === null && <Text style={styles.optionCheck}>✓</Text>}
            </TouchableOpacity>
            {periods.length === 0 ? (
              <Text style={styles.sheetEmpty}>No hay períodos disponibles.</Text>
            ) : (
              periods.map((p) => {
                const selected = period?.id === p.id;
                const isOpen = p.status === "Open";
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.optionRow}
                    onPress={() => {
                      setPeriod(p);
                      setActivePicker(null);
                    }}
                    testID={`deduction-period-option-${p.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar período ${periodLabel(p)}`}
                    accessibilityState={{ selected }}
                  >
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.optionTitle}>{periodLabel(p)}</Text>
                    </View>
                    <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
                      <Text style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
                        {isOpen ? "Abierto" : "Cerrado"}
                      </Text>
                    </View>
                    {selected && <Text style={styles.optionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </PickerSheet>
        </>
      )}
    </Modal>
  );
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
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: designTokens.radius.sm,
    alignItems: "center",
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: designTokens.color.surface.success,
  },
  statusClosed: {
    backgroundColor: designTokens.color.surface.secondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusTextOpen: {
    color: designTokens.color.status.successText,
  },
  statusTextClosed: {
    color: designTokens.color.ink.muted,
  },
});
