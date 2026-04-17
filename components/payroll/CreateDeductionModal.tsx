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
  Alert 
} from "react-native";
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
    if (deductionType === "Fixed") {
      return text.replace(/[^0-9.]/g, "");
    }
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
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nueva Deducción</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={!isValid || loading}
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
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cancelButton: {
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  submitButton: {
    fontSize: 16,
    color: "#1976d2",
    fontWeight: "600",
  },
  submitButtonDisabled: {
    color: "#ccc",
  },
  form: {
    flex: 1,
    padding: 16,
  },
  errorCard: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#991b1b",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    borderColor: "#ddd",
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#1976d2",
    borderColor: "#1976d2",
  },
  optionButtonText: {
    fontSize: 13,
    color: "#666",
  },
  optionButtonTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
});