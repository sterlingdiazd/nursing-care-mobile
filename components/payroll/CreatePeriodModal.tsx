import { useState } from "react";
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

interface CreatePeriodModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    startDate: string;
    endDate: string;
    cutoffDate: string;
    paymentDate: string;
  }) => Promise<void>;
}

export function CreatePeriodModal({ visible, onClose, onSubmit }: CreatePeriodModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = startDate.length >= 8 && 
                 endDate.length >= 8 && 
                 cutoffDate.length >= 8 && 
                 paymentDate.length >= 8;

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setCutoffDate("");
    setPaymentDate("");
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
      await onSubmit({
        startDate,
        endDate,
        cutoffDate,
        paymentDate,
      });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el período");
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (text: string): string => {
    const digits = text.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4,8)}`;
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
          <Text style={styles.title}>Nuevo Período</Text>
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

          <Text style={styles.hint}>
            Ingresa las fechas en formato DD/MM/AAAA
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fecha de Inicio</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={(text) => setStartDate(parseDate(text))}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fecha de Fin</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={(text) => setEndDate(parseDate(text))}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fecha de Corte</Text>
            <TextInput
              style={styles.input}
              value={cutoffDate}
              onChangeText={(text) => setCutoffDate(parseDate(text))}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fecha de Pago</Text>
            <TextInput
              style={styles.input}
              value={paymentDate}
              onChangeText={(text) => setPaymentDate(parseDate(text))}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          {!isValid && startDate.length > 0 && (
            <Text style={styles.validationHint}>
              Completa todas las fechas para crear el período
            </Text>
          )}
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
  hint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
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
  validationHint: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
  },
});