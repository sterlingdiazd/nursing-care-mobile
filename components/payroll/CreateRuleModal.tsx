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
import type { 
  AdminCompensationRuleListItem, 
  CreateCompensationRuleRequest,
  UpdateCompensationRuleRequest 
} from "@/src/services/payrollService";

interface CreateRuleModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompensationRuleRequest | UpdateCompensationRuleRequest) => Promise<void>;
  onDeactivate?: () => Promise<void>;
  editingRule?: AdminCompensationRuleListItem | null;
}

const EMPLOYMENT_TYPES = [
  { value: "FullTime", label: "Tiempo Completo" },
  { value: "PartTime", label: "Medio Tiempo" },
  { value: "Contractor", label: "Contratista" },
];

export function CreateRuleModal({ visible, onClose, onSubmit, onDeactivate, editingRule }: CreateRuleModalProps) {
  const [name, setName] = useState("");
  const [employmentType, setEmploymentType] = useState("FullTime");
  const [baseCompensationPercent, setBaseCompensationPercent] = useState("");
  const [transportIncentivePercent, setTransportIncentivePercent] = useState("");
  const [complexityBonusPercent, setComplexityBonusPercent] = useState("");
  const [medicalSuppliesPercent, setMedicalSuppliesPercent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setEmploymentType(editingRule.employmentType);
      setBaseCompensationPercent(String(editingRule.baseCompensationPercent));
      setTransportIncentivePercent(String(editingRule.transportIncentivePercent));
      setComplexityBonusPercent(String(editingRule.complexityBonusPercent));
      setMedicalSuppliesPercent(String(editingRule.medicalSuppliesPercent));
    } else {
      setName("");
      setEmploymentType("FullTime");
      setBaseCompensationPercent("");
      setTransportIncentivePercent("");
      setComplexityBonusPercent("");
      setMedicalSuppliesPercent("");
    }
    setError(null);
  }, [editingRule, visible]);

  const isValid = name.trim().length > 0 && 
                  parseFloat(baseCompensationPercent) > 0;

  const resetForm = () => {
    setName("");
    setEmploymentType("FullTime");
    setBaseCompensationPercent("");
    setTransportIncentivePercent("");
    setComplexityBonusPercent("");
    setMedicalSuppliesPercent("");
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
      const data = editingRule
        ? {
            name: name.trim(),
            baseCompensationPercent: parseFloat(baseCompensationPercent),
            transportIncentivePercent: parseFloat(transportIncentivePercent) || 0,
            complexityBonusPercent: parseFloat(complexityBonusPercent) || 0,
            medicalSuppliesPercent: parseFloat(medicalSuppliesPercent) || 0,
          } as UpdateCompensationRuleRequest
        : {
            name: name.trim(),
            employmentType,
            baseCompensationPercent: parseFloat(baseCompensationPercent),
            transportIncentivePercent: parseFloat(transportIncentivePercent) || 0,
            complexityBonusPercent: parseFloat(complexityBonusPercent) || 0,
            medicalSuppliesPercent: parseFloat(medicalSuppliesPercent) || 0,
          } as CreateCompensationRuleRequest;
      
      await onSubmit(data);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la regla");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Desactivar Regla",
      "¿Estás seguro de desactivar esta regla?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Desactivar", 
          style: "destructive",
          onPress: async () => {
            try {
              await onDeactivate?.();
              handleClose();
            } catch (e) {
              Alert.alert("Error", "No fue posible desactivar la regla");
            }
          }
        },
      ]
    );
  };

  const parsePercent = (text: string): string => {
    const digits = text.replace(/[^0-9.]/g, "");
    const parts = digits.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    if (parts[1]?.length > 2) return parts[0] + "." + parts[1].slice(0, 2);
    return digits;
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
          <Text style={styles.title}>{editingRule ? "Editar Regla" : "Nueva Regla"}</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={!isValid || loading}
          >
            <Text style={[
              styles.submitButton,
              (!isValid || loading) && styles.submitButtonDisabled
            ]}>
              {loading ? "Guardando..." : "Guardar"}
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
            <Text style={styles.label}>Nombre de la Regla *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="ej. Pago por servicio hogar"
              autoCapitalize="words"
            />
          </View>

          {!editingRule && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Empleo</Text>
              <View style={styles.optionsRow}>
                {EMPLOYMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionButton,
                      employmentType === type.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => setEmploymentType(type.value)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      employmentType === type.value && styles.optionButtonTextSelected,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Porcentajes</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Compensación Base (%) *</Text>
            <TextInput
              style={styles.input}
              value={baseCompensationPercent}
              onChangeText={(text) => setBaseCompensationPercent(parsePercent(text))}
              placeholder="52"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Incentivo Transporte (%)</Text>
            <TextInput
              style={styles.input}
              value={transportIncentivePercent}
              onChangeText={(text) => setTransportIncentivePercent(parsePercent(text))}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bonificación Complejidad (%)</Text>
            <TextInput
              style={styles.input}
              value={complexityBonusPercent}
              onChangeText={(text) => setComplexityBonusPercent(parsePercent(text))}
              placeholder="20"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Compensación Insumos (%)</Text>
            <TextInput
              style={styles.input}
              value={medicalSuppliesPercent}
              onChangeText={(text) => setMedicalSuppliesPercent(parsePercent(text))}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>

          {editingRule && editingRule.isActive && onDeactivate && (
            <TouchableOpacity 
              style={styles.deactivateButton}
              onPress={handleDeactivate}
            >
              <Text style={styles.deactivateButtonText}>Desactivar Regla</Text>
            </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 12,
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
  deactivateButton: {
    backgroundColor: "#fee2e2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  deactivateButtonText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
  },
});