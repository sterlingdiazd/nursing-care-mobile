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
import type { CreateCompensationAdjustmentRequest } from "@/src/services/payrollService";

interface CreateAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompensationAdjustmentRequest) => Promise<void>;
}

export function CreateAdjustmentModal({ visible, onClose, onSubmit }: CreateAdjustmentModalProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [serviceExecutionId, setServiceExecutionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLabel("");
      setAmount("");
      setServiceExecutionId("");
      setError(null);
    }
  }, [visible]);

  const isValid = label.trim().length > 0 && 
                  parseFloat(amount) !== 0 &&
                  serviceExecutionId.trim().length > 0;

  const resetForm = () => {
    setLabel("");
    setAmount("");
    setServiceExecutionId("");
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
      const data: CreateCompensationAdjustmentRequest = {
        label: label.trim(),
        amount: parseFloat(amount),
        serviceExecutionId: serviceExecutionId.trim(),
      };
      
      await onSubmit(data);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el ajuste");
    } finally {
      setLoading(false);
    }
  };

  const parseAmount = (text: string): string => {
    const clean = text.replace(/[^0-9.-]/g, "");
    return clean;
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
          <Text style={styles.title}>Nuevo Ajuste</Text>
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
            <Text style={styles.label}>Ejecución de Servicio (ID) *</Text>
            <TextInput
              style={styles.input}
              value={serviceExecutionId}
              onChangeText={setServiceExecutionId}
              placeholder="GUID de la ejecución"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>El ID de la ejecución de servicio de la línea de nómina</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Etiqueta *</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="ej. Bonificación especial"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto (positivo=bonificación, negativo=deducción) *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={(text) => setAmount(parseAmount(text))}
              placeholder="500 o -500"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Vista previa:</Text>
            <Text style={[
              styles.previewAmount,
              parseFloat(amount) >= 0 ? styles.previewPositive : styles.previewNegative
            ]}>
              {parseFloat(amount) >= 0 ? "+" : ""}{parseFloat(amount) || 0} DOP
            </Text>
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
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  preview: {
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  previewLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: "bold",
  },
  previewPositive: {
    color: "#2e7d32",
  },
  previewNegative: {
    color: "#dc2626",
  },
});