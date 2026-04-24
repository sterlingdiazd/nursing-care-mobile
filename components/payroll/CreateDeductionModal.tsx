import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import type { CreateDeductionRequest } from "@/src/services/payrollService";

interface CreateDeductionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeductionRequest) => Promise<void>;
}

const DEDUCTION_TYPES = [
  { value: "Fixed", label: "Fijo" },
  { value: "Percentage", label: "Porcentaje" },
];

export function CreateDeductionModal({ visible, onClose, onSubmit }: CreateDeductionModalProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [nurseUserId, setNurseUserId] = useState("");
  const [payrollPeriodId, setPayrollPeriodId] = useState("");
  const [deductionType, setDeductionType] = useState("Fixed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLabel("");
      setAmount("");
      setNurseUserId("");
      setPayrollPeriodId("");
      setDeductionType("Fixed");
      setError(null);
    }
  }, [visible]);

  const isValid = label.trim().length > 0 &&
                  parseFloat(amount) > 0 &&
                  nurseUserId.trim().length > 0;

  const resetForm = () => {
    setLabel("");
    setAmount("");
    setNurseUserId("");
    setPayrollPeriodId("");
    setDeductionType("Fixed");
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
      const data: CreateDeductionRequest = {
        label: label.trim(),
        amount: parseFloat(amount),
        nurseUserId: nurseUserId.trim(),
        payrollPeriodId: payrollPeriodId.trim() || undefined,
        deductionType,
      };

      await onSubmit(data);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la deducción");
    } finally {
      setLoading(false);
    }
  };

  const parseAmount = (text: string): string => {
    return text.replace(/[^0-9.]/g, "");
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
            accessibilityLabel="Cancelar creación de deducción"
          >
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nueva Deducción</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? "Creando deducción" : "Crear deducción"}
            accessibilityState={{ busy: loading, disabled: !isValid || loading }}
          >
            <Text style={[
              styles.submitButton,
              (!isValid || loading) && styles.submitButtonDisabled
            ]}>
              {loading ? "Creando..." : "Crear"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Enfermera (ID) *</Text>
            <TextInput
              style={styles.input}
              value={nurseUserId}
              onChangeText={setNurseUserId}
              placeholder="GUID de la enfermera"
              autoCapitalize="none"
              accessibilityLabel="Identificador de la enfermera"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Etiqueta *</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="ej. Seguro médico"
              autoCapitalize="words"
              accessibilityLabel="Etiqueta de la deducción"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Deducción</Text>
            <View style={styles.optionsRow}>
              {DEDUCTION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.optionButton,
                    deductionType === type.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setDeductionType(type.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Tipo de deducción: ${type.label}`}
                  accessibilityState={{ selected: deductionType === type.value }}
                >
                  <Text style={[
                    styles.optionButtonText,
                    deductionType === type.value && styles.optionButtonTextSelected,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto {deductionType === "Percentage" ? "(%)" : ""} *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={(text) => setAmount(parseAmount(text))}
              placeholder={deductionType === "Percentage" ? "5" : "1500"}
              keyboardType="decimal-pad"
              accessibilityLabel={deductionType === "Percentage" ? "Monto porcentual de la deducción" : "Monto fijo de la deducción"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Período (ID, opcional)</Text>
            <TextInput
              style={styles.input}
              value={payrollPeriodId}
              onChangeText={setPayrollPeriodId}
              placeholder="GUID del período"
              autoCapitalize="none"
              accessibilityLabel="Identificador del período de nómina (opcional)"
            />
          </View>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  cancelButton: {
    fontSize: 16,
    color: designTokens.color.ink.muted,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
  },
  submitButton: {
    fontSize: 16,
    color: designTokens.color.ink.accentStrong,
    fontWeight: "600",
  },
  submitButtonDisabled: {
    color: designTokens.color.border.strong,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  errorCard: {
    backgroundColor: designTokens.color.surface.danger,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: designTokens.color.status.dangerText,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: designTokens.color.ink.primary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: designTokens.color.ink.primary,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: designTokens.color.ink.accentStrong,
    borderColor: designTokens.color.ink.accentStrong,
  },
  optionButtonText: {
    fontSize: 13,
    color: designTokens.color.ink.muted,
  },
  optionButtonTextSelected: {
    color: designTokens.color.ink.inverse,
    fontWeight: "500",
  },
});
