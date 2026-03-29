import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  createAdminCareRequest,
  getAdminCareRequestClients,
  type CreateAdminCareRequestDto,
  type AdminCareRequestClientOptionDto,
} from "@/src/services/adminPortalService";

export default function CreateAdminCareRequestScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState<CreateAdminCareRequestDto>({
    clientUserId: "",
    careRequestDescription: "",
    careRequestType: "",
    unit: 1,
    suggestedNurse: "",
    price: undefined,
    clientBasePriceOverride: undefined,
    distanceFactor: "",
    complexityLevel: "",
    medicalSuppliesCost: undefined,
    careRequestDate: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Client search
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<AdminCareRequestClientOptionDto[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AdminCareRequestClientOptionDto | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  // Load clients when search changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (clientSearch.trim()) {
        try {
          const result = await getAdminCareRequestClients(clientSearch);
          setClients(result);
        } catch (err) {
          console.error("Error loading clients:", err);
        }
      } else {
        setClients([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.clientUserId) newErrors.clientUserId = "Debe seleccionar un cliente";
    if (!form.careRequestDescription.trim()) newErrors.careRequestDescription = "La descripción es obligatoria";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.careRequestType.trim()) newErrors.careRequestType = "El tipo es obligatorio";
    if (!form.unit || form.unit <= 0) newErrors.unit = "Las unidades deben ser mayores a 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const handlePrevious = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      setError("Por favor complete todos los campos obligatorios");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const result = await createAdminCareRequest(form);
      router.push(`/admin/care-requests/${result.id}` as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectClient = (client: AdminCareRequestClientOptionDto) => {
    setSelectedClient(client);
    setForm({ ...form, clientUserId: client.userId });
    setShowClientPicker(false);
    setClientSearch("");
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Crear Solicitud"
      title="Nueva solicitud de cuidado"
      description="Crear una solicitud de servicio en nombre de un cliente."
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.stepIndicator}>
        <Text style={styles.stepText}>Paso {step} de 3</Text>
      </View>

      <ScrollView>
        {/* Step 1: Client and Description */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Básica</Text>

            <Text style={styles.label}>Cliente *</Text>
            {selectedClient ? (
              <View style={styles.selectedClient}>
                <Text style={styles.selectedClientName}>{selectedClient.displayName}</Text>
                <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
                <Pressable onPress={() => { setSelectedClient(null); setForm({ ...form, clientUserId: "" }); }}>
                  <Text style={styles.changeLink}>Cambiar</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Buscar cliente por nombre o correo"
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  onFocus={() => setShowClientPicker(true)}
                />
                {showClientPicker && clients.length > 0 && (
                  <View style={styles.clientPicker}>
                    {clients.map((client) => (
                      <Pressable
                        key={client.userId}
                        style={styles.clientOption}
                        onPress={() => handleSelectClient(client)}
                      >
                        <Text style={styles.clientOptionName}>{client.displayName}</Text>
                        <Text style={styles.clientOptionEmail}>{client.email}</Text>
                        {client.identificationNumber && (
                          <Text style={styles.clientOptionId}>Cédula: {client.identificationNumber}</Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
            {errors.clientUserId && <Text style={styles.errorText}>{errors.clientUserId}</Text>}

            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción del servicio solicitado"
              value={form.careRequestDescription}
              onChangeText={(text) => setForm({ ...form, careRequestDescription: text })}
              multiline
              numberOfLines={4}
            />
            {errors.careRequestDescription && <Text style={styles.errorText}>{errors.careRequestDescription}</Text>}
          </View>
        )}

        {/* Step 2: Type and Details */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalles del Servicio</Text>

            <Text style={styles.label}>Tipo de solicitud *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Cuidado básico, Cuidado especializado"
              value={form.careRequestType}
              onChangeText={(text) => setForm({ ...form, careRequestType: text })}
            />
            {errors.careRequestType && <Text style={styles.errorText}>{errors.careRequestType}</Text>}

            <Text style={styles.label}>Unidades *</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de unidades"
              value={form.unit?.toString() || ""}
              onChangeText={(text) => setForm({ ...form, unit: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}

            <Text style={styles.label}>Enfermera sugerida</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la enfermera (opcional)"
              value={form.suggestedNurse}
              onChangeText={(text) => setForm({ ...form, suggestedNurse: text })}
            />

            <Text style={styles.label}>Fecha programada</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (opcional)"
              value={form.careRequestDate}
              onChangeText={(text) => setForm({ ...form, careRequestDate: text })}
            />
          </View>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Configuración de Precios</Text>
            <Text style={styles.subtitle}>Todos los campos son opcionales. Si no se especifican, se usarán los valores predeterminados.</Text>

            <Text style={styles.label}>Precio base (override)</Text>
            <TextInput
              style={styles.input}
              placeholder="Precio base personalizado"
              value={form.clientBasePriceOverride?.toString() || ""}
              onChangeText={(text) => setForm({ ...form, clientBasePriceOverride: parseFloat(text) || undefined })}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Factor de distancia</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Cerca, Lejos"
              value={form.distanceFactor}
              onChangeText={(text) => setForm({ ...form, distanceFactor: text })}
            />

            <Text style={styles.label}>Nivel de complejidad</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Básico, Intermedio, Avanzado"
              value={form.complexityLevel}
              onChangeText={(text) => setForm({ ...form, complexityLevel: text })}
            />

            <Text style={styles.label}>Costo de suministros médicos</Text>
            <TextInput
              style={styles.input}
              placeholder="Costo adicional de suministros"
              value={form.medicalSuppliesCost?.toString() || ""}
              onChangeText={(text) => setForm({ ...form, medicalSuppliesCost: parseFloat(text) || undefined })}
              keyboardType="numeric"
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {step > 1 && (
          <Pressable style={styles.button} onPress={handlePrevious}>
            <Text style={styles.buttonText}>Anterior</Text>
          </Pressable>
        )}
        {step < 3 && (
          <Pressable style={styles.buttonPrimary} onPress={handleNext}>
            <Text style={styles.buttonPrimaryText}>Siguiente</Text>
          </Pressable>
        )}
        {step === 3 && (
          <Pressable style={styles.buttonPrimary} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.buttonPrimaryText}>{submitting ? "Creando..." : "Crear Solicitud"}</Text>
          </Pressable>
        )}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  stepIndicator: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 12, padding: 12, marginBottom: 12 },
  stepText: { color: "#102a43", fontSize: 14, fontWeight: "700", textAlign: "center" },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#102a43", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#52637a", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "700", color: "#7c2d12", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, padding: 12, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  selectedClient: { backgroundColor: "#f0f4f8", borderRadius: 12, padding: 12, marginBottom: 8 },
  selectedClientName: { fontSize: 16, fontWeight: "700", color: "#102a43" },
  selectedClientEmail: { fontSize: 14, color: "#52637a", marginTop: 2 },
  changeLink: { color: "#3b82f6", fontSize: 14, marginTop: 8, textDecorationLine: "underline" },
  clientPicker: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, marginTop: 8, maxHeight: 200 },
  clientOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  clientOptionName: { fontSize: 15, fontWeight: "700", color: "#102a43" },
  clientOptionEmail: { fontSize: 13, color: "#52637a", marginTop: 2 },
  clientOptionId: { fontSize: 12, color: "#7c2d12", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { flex: 1, backgroundColor: "#f0f4f8", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 16 },
  buttonPrimary: { flex: 1, backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});
