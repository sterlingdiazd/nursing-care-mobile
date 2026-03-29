import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getNurseProfileForAdmin,
  updateNurseProfileForAdmin,
  type NurseProfileAdminRecordDto,
  type UpdateNurseProfileRequest,
} from "@/src/services/adminPortalService";

export default function AdminEditNurseProfileScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<NurseProfileAdminRecordDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState<UpdateNurseProfileRequest>({
    name: "",
    lastName: "",
    identificationNumber: "",
    phone: "",
    email: "",
    hireDate: "",
    specialty: "",
    licenseId: "",
    bankName: "",
    accountNumber: "",
    category: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = async () => {
    if (!id) return;
    try {
      setLoadError(null);
      setLoading(true);
      const data = await getNurseProfileForAdmin(id);
      setProfile(data);
      setForm({
        name: data.name || "",
        lastName: data.lastName || "",
        identificationNumber: data.identificationNumber || "",
        phone: data.phone || "",
        email: data.email || "",
        hireDate: data.hireDate || "",
        specialty: data.specialty || "",
        licenseId: data.licenseId || "",
        bankName: data.bankName || "",
        accountNumber: data.accountNumber || "",
        category: data.category || "",
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No fue posible cargar el perfil de la enfermera.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, id]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!form.lastName.trim()) newErrors.lastName = "El apellido es obligatorio";
    if (!form.identificationNumber.trim()) newErrors.identificationNumber = "La cédula es obligatoria";
    if (!form.phone.trim()) newErrors.phone = "El teléfono es obligatorio";
    if (!form.email.trim()) newErrors.email = "El correo electrónico es obligatorio";
    else if (!form.email.includes("@")) newErrors.email = "El correo debe ser válido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.hireDate.trim()) newErrors.hireDate = "La fecha de contratación es obligatoria";
    if (!form.specialty.trim()) newErrors.specialty = "La especialidad es obligatoria";
    if (!form.category.trim()) newErrors.category = "La categoría es obligatoria";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.bankName.trim()) newErrors.bankName = "El banco es obligatorio";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const handlePrevious = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep3() || !id) return;

    try {
      setSubmitError(null);
      setSubmitting(true);
      await updateNurseProfileForAdmin(id, form);
      router.replace(`/admin/nurse-profiles/${id}` as never);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No fue posible actualizar el perfil de la enfermera.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Editar Perfil"
      title="Editar enfermera"
      description="Actualizar la información del perfil de la enfermera."
    >
      {!!loadError && <Text style={styles.error}>{loadError}</Text>}
      {!!submitError && <Text style={styles.error}>{submitError}</Text>}
      {loading && <Text style={styles.loading}>Cargando...</Text>}

      <View style={styles.stepIndicator}>
        <Text style={styles.stepText}>Paso {step} de 3</Text>
      </View>

      <ScrollView>
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Personal</Text>

            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : undefined]}
              placeholder="Nombre de la enfermera"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <Text style={styles.label}>Apellido *</Text>
            <TextInput
              style={[styles.input, errors.lastName ? styles.inputError : undefined]}
              placeholder="Apellido de la enfermera"
              value={form.lastName}
              onChangeText={(text) => setForm({ ...form, lastName: text })}
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

            <Text style={styles.label}>Cédula *</Text>
            <TextInput
              style={[styles.input, errors.identificationNumber ? styles.inputError : undefined]}
              placeholder="Número de cédula"
              value={form.identificationNumber}
              onChangeText={(text) => setForm({ ...form, identificationNumber: text })}
            />
            {errors.identificationNumber && <Text style={styles.errorText}>{errors.identificationNumber}</Text>}

            <Text style={styles.label}>Teléfono *</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : undefined]}
              placeholder="Número de teléfono"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

            <Text style={styles.label}>Correo electrónico *</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : undefined]}
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
        )}

        {/* Step 2: Professional Info */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Profesional</Text>

            <Text style={styles.label}>Fecha de contratación *</Text>
            <TextInput
              style={[styles.input, errors.hireDate ? styles.inputError : undefined]}
              placeholder="YYYY-MM-DD"
              value={form.hireDate}
              onChangeText={(text) => setForm({ ...form, hireDate: text })}
            />
            {errors.hireDate && <Text style={styles.errorText}>{errors.hireDate}</Text>}

            <Text style={styles.label}>Especialidad *</Text>
            <TextInput
              style={[styles.input, errors.specialty ? styles.inputError : undefined]}
              placeholder="Especialidad de la enfermera"
              value={form.specialty}
              onChangeText={(text) => setForm({ ...form, specialty: text })}
            />
            {errors.specialty && <Text style={styles.errorText}>{errors.specialty}</Text>}

            <Text style={styles.label}>Número de licencia</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de licencia profesional (opcional)"
              value={form.licenseId ?? ""}
              onChangeText={(text) => setForm({ ...form, licenseId: text })}
            />

            <Text style={styles.label}>Categoría *</Text>
            <TextInput
              style={[styles.input, errors.category ? styles.inputError : undefined]}
              placeholder="Categoría profesional"
              value={form.category}
              onChangeText={(text) => setForm({ ...form, category: text })}
            />
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>
        )}

        {/* Step 3: Banking Info */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Bancaria</Text>

            <Text style={styles.label}>Banco *</Text>
            <TextInput
              style={[styles.input, errors.bankName ? styles.inputError : undefined]}
              placeholder="Nombre del banco"
              value={form.bankName}
              onChangeText={(text) => setForm({ ...form, bankName: text })}
            />
            {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}

            <Text style={styles.label}>Número de cuenta</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de cuenta bancaria (opcional)"
              value={form.accountNumber ?? ""}
              onChangeText={(text) => setForm({ ...form, accountNumber: text })}
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
        {step === 1 && (
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </Pressable>
        )}
        {step < 3 && (
          <Pressable style={styles.buttonPrimary} onPress={handleNext}>
            <Text style={styles.buttonPrimaryText}>Siguiente</Text>
          </Pressable>
        )}
        {step === 3 && (
          <Pressable style={styles.buttonPrimary} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.buttonPrimaryText}>{submitting ? "Guardando..." : "Guardar"}</Text>
          </Pressable>
        )}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  loading: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  stepIndicator: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 12, padding: 12, marginBottom: 12 },
  stepText: { color: "#102a43", fontSize: 14, fontWeight: "700", textAlign: "center" },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#102a43", marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "700", color: "#7c2d12", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, padding: 12, fontSize: 15 },
  inputError: { borderColor: "#c00" },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { flex: 1, backgroundColor: "#f0f4f8", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 16 },
  buttonPrimary: { flex: 1, backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});
