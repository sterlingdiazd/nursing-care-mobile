import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import type { CreateCompensationAdjustmentRequest } from "@/src/services/payrollService";
import {
  getPayrollPeriods,
  getPayrollPeriodById,
} from "@/src/services/payrollService";
import type { AdminPayrollPeriodListItem, AdminPayrollLineItem } from "@/src/services/payrollService";
import { useAuth } from "@/src/context/AuthContext";
import { formatDateES } from "@/src/utils/spanishTextValidator";

interface CreateAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompensationAdjustmentRequest) => Promise<void>;
}

type PickerStep = "period" | "line" | null;

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

export function CreateAdjustmentModal({ visible, onClose, onSubmit }: CreateAdjustmentModalProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Service picker state
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
      .then((result) => {
        if (!cancelled) setPeriods(result.items);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar los períodos.");
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
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

    // Open line picker immediately after period is chosen
    setActivePicker("line");
  }, []);

  const handleSelectLine = useCallback((line: AdminPayrollLineItem) => {
    setSelectedLine(line);
    setActivePicker(null);
  }, []);

  const periodLabel = (p: AdminPayrollPeriodListItem) =>
    `${formatDateES(p.startDate)} – ${formatDateES(p.endDate)}`;

  const isValid =
    label.trim().length > 0 &&
    parseFloat(amount) !== 0 &&
    selectedLine !== null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedLine) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        label: label.trim(),
        amount: parseFloat(amount),
        serviceExecutionId: selectedLine.serviceExecutionId,
      });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el ajuste");
    } finally {
      setLoading(false);
    }
  };

  const parseAmount = (text: string): string => text.replace(/[^0-9.-]/g, "");
  const parsedAmount = parseFloat(amount);

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
            accessibilityLabel="Cancelar creación de ajuste"
          >
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo Ajuste</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? "Creando ajuste" : "Crear ajuste de compensación"}
            accessibilityState={{ busy: loading, disabled: !isValid || loading }}
            testID="adjustment-submit-button"
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

          {/* Step 1: Select period */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Período de nómina *</Text>
            <TouchableOpacity
              style={[styles.select, !selectedPeriod && styles.selectEmpty]}
              onPress={() => setActivePicker("period")}
              disabled={optionsLoading}
              testID="adjustment-period-select"
              accessibilityRole="button"
              accessibilityLabel="Seleccionar período de nómina"
            >
              {optionsLoading ? (
                <ActivityIndicator color={designTokens.color.ink.accent} />
              ) : selectedPeriod ? (
                <Text style={styles.selectValue}>{periodLabel(selectedPeriod)}</Text>
              ) : (
                <Text style={styles.selectPlaceholder}>Selecciona un período</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Step 2: Select service line */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Línea de servicio *</Text>
            <TouchableOpacity
              style={[styles.select, !selectedLine && styles.selectEmpty]}
              onPress={() => {
                if (!selectedPeriod) {
                  setActivePicker("period");
                  return;
                }
                setActivePicker("line");
              }}
              disabled={linesLoading}
              testID="adjustment-line-select"
              accessibilityRole="button"
              accessibilityLabel="Seleccionar línea de servicio"
            >
              {linesLoading ? (
                <ActivityIndicator color={designTokens.color.ink.accent} />
              ) : selectedLine ? (
                <View style={styles.selectValueWrap}>
                  <Text style={styles.selectValue}>{selectedLine.nurseDisplayName}</Text>
                  <Text style={styles.selectSubtitle}>{selectedLine.description}</Text>
                </View>
              ) : (
                <Text style={styles.selectPlaceholder}>
                  {selectedPeriod ? "Selecciona una línea" : "Primero selecciona un período"}
                </Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Etiqueta *</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="ej. Bonificación especial"
              placeholderTextColor={designTokens.color.ink.muted}
              autoCapitalize="words"
              testID="adjustment-label-input"
              nativeID="adjustment-label-input"
              accessibilityLabel="Etiqueta del ajuste"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto (positivo = bonificación, negativo = deducción) *</Text>
            <View style={styles.amountField}>
              <Text style={styles.amountAffix}>RD$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => setAmount(parseAmount(text))}
                placeholder="500 o -500"
                placeholderTextColor={designTokens.color.ink.muted}
                keyboardType="decimal-pad"
                testID="adjustment-amount-input"
                nativeID="adjustment-amount-input"
                accessibilityLabel="Monto del ajuste, positivo para bonificación o negativo para deducción"
              />
            </View>
          </View>

          {!isNaN(parsedAmount) && amount.length > 0 && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Vista previa:</Text>
              <Text style={[styles.previewAmount, parsedAmount >= 0 ? styles.previewPositive : styles.previewNegative]}>
                {parsedAmount >= 0 ? "+" : ""}{parsedAmount || 0} DOP
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Period picker sheet */}
      <PickerSheet
        visible={activePicker === "period"}
        title="Selecciona un período"
        onClose={() => setActivePicker(null)}
      >
        {periods.length === 0 ? (
          <Text style={styles.sheetEmpty}>No hay períodos disponibles.</Text>
        ) : (
          periods.map((p) => {
            const selected = selectedPeriod?.id === p.id;
            const isOpen = p.status === "Open";
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.optionRow}
                onPress={() => void handleSelectPeriod(p)}
                testID={`adjustment-period-option-${p.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar período ${periodLabel(p)}`}
                accessibilityState={{ selected }}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{periodLabel(p)}</Text>
                  <Text style={styles.optionSubtitle}>{p.lineCount} líneas</Text>
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

      {/* Line picker sheet */}
      <PickerSheet
        visible={activePicker === "line"}
        title="Selecciona una línea de servicio"
        onClose={() => setActivePicker(null)}
      >
        {linesLoading ? (
          <View style={styles.sheetLoadingWrap}>
            <ActivityIndicator color={designTokens.color.ink.accent} />
          </View>
        ) : periodLines.length === 0 ? (
          <Text style={styles.sheetEmpty}>Este período no tiene líneas.</Text>
        ) : (
          periodLines.map((line) => {
            const selected = selectedLine?.id === line.id;
            return (
              <TouchableOpacity
                key={line.id}
                style={styles.optionRow}
                onPress={() => handleSelectLine(line)}
                testID={`adjustment-line-option-${line.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar línea de ${line.nurseDisplayName}`}
                accessibilityState={{ selected }}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{line.nurseDisplayName}</Text>
                  <Text style={styles.optionSubtitle}>{line.description}</Text>
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
  preview: {
    backgroundColor: designTokens.color.surface.secondary,
    padding: 16,
    borderRadius: designTokens.radius.md,
    alignItems: "center",
    marginTop: designTokens.spacing.md,
  },
  previewLabel: {
    fontSize: 13,
    color: designTokens.color.ink.muted,
    marginBottom: 4,
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: "800",
  },
  previewPositive: {
    color: designTokens.color.status.successText,
  },
  previewNegative: {
    color: designTokens.color.ink.danger,
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
  sheetEmpty: {
    fontSize: 14,
    color: designTokens.color.ink.muted,
    paddingVertical: designTokens.spacing.xl,
    textAlign: "center",
  },
  sheetLoadingWrap: {
    paddingVertical: designTokens.spacing.xxl,
    alignItems: "center",
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
