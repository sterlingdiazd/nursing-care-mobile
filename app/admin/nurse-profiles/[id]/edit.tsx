import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { FormInput } from "@/src/components/form/FormInput";
import {
  getNurseProfileForAdmin,
  updateNurseProfileForAdmin,
  type NurseProfileAdminRecordDto,
  type UpdateNurseProfileRequest,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";

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
      testID={adminTestIds.nurses.edit.screen}
      nativeID={adminTestIds.nurses.edit.screen}
    >
      {!!loadError && (
        <Text
          testID={adminTestIds.nurses.edit.errorBanner}
          nativeID={adminTestIds.nurses.edit.errorBanner}
          style={styles.error}
        >
          {loadError}
        </Text>
      )}
      {!!submitError && (
        <Text
          testID={adminTestIds.nurses.edit.errorBanner}
          nativeID={adminTestIds.nurses.edit.errorBanner}
          style={styles.error}
        >
          {submitError}
        </Text>
      )}
      {loading && <Text style={styles.loading}>Cargando...</Text>}

      <View style={styles.stepIndicator}>
        <Text
          testID={adminTestIds.nurses.edit.progressChip}
          nativeID={adminTestIds.nurses.edit.progressChip}
          style={styles.stepText}
        >
          Paso {step} de 3
        </Text>
      </View>

      <ScrollView>
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Personal</Text>

            <FormInput
              testID="admin-edit-nurse-name-input"
              label="Nombre *"
              placeholder="Nombre de la enfermera"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              errorMessage={errors.name}
              accessibilityLabel="Nombre de la enfermera"
            />

            <FormInput
              testID="admin-edit-nurse-lastname-input"
              label="Apellido *"
              placeholder="Apellido de la enfermera"
              value={form.lastName}
              onChangeText={(text) => setForm({ ...form, lastName: text })}
              errorMessage={errors.lastName}
              accessibilityLabel="Apellido de la enfermera"
            />

            <FormInput
              testID="admin-edit-nurse-id-input"
              label="Cédula *"
              placeholder="Número de cédula"
              value={form.identificationNumber}
              onChangeText={(text) => setForm({ ...form, identificationNumber: text })}
              errorMessage={errors.identificationNumber}
              accessibilityLabel="Número de cédula de la enfermera"
            />

            <FormInput
              testID="admin-edit-nurse-phone-input"
              label="Teléfono *"
              placeholder="Número de teléfono"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              errorMessage={errors.phone}
              keyboardType="phone-pad"
              accessibilityLabel="Número de teléfono de la enfermera"
            />

            <FormInput
              testID="admin-edit-nurse-email-input"
              label="Correo electrónico *"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              errorMessage={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Correo electrónico de la enfermera"
            />
          </View>
        )}

        {/* Step 2: Professional Info */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Profesional</Text>

            <FormInput
              testID="admin-edit-nurse-hire-date-input"
              label="Fecha de contratación *"
              placeholder="YYYY-MM-DD"
              value={form.hireDate}
              onChangeText={(text) => setForm({ ...form, hireDate: text })}
              errorMessage={errors.hireDate}
              accessibilityLabel="Fecha de contratación de la enfermera"
            />

            <FormInput
              testID="admin-edit-nurse-specialty-input"
              label="Especialidad *"
              placeholder="Especialidad de la enfermera"
              value={form.specialty}
              onChangeText={(text) => setForm({ ...form, specialty: text })}
              errorMessage={errors.specialty}
              accessibilityLabel="Especialidad de la enfermera"
            />

            <FormInput
              testID="admin-edit-nurse-license-input"
              label="Número de licencia"
              placeholder="Número de licencia profesional (opcional)"
              value={form.licenseId ?? ""}
              onChangeText={(text) => setForm({ ...form, licenseId: text })}
              accessibilityLabel="Número de licencia profesional de la enfermera"
            />

            <FormInput
              testID="admin-edit-nurse-category-input"
              label="Categoría *"
              placeholder="Categoría profesional"
              value={form.category}
              onChangeText={(text) => setForm({ ...form, category: text })}
              errorMessage={errors.category}
              accessibilityLabel="Categoría profesional de la enfermera"
            />
          </View>
        )}

        {/* Step 3: Banking Info */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Bancaria</Text>

            <FormInput
              testID="admin-edit-nurse-bank-input"
              label="Banco *"
              placeholder="Nombre del banco"
              value={form.bankName}
              onChangeText={(text) => setForm({ ...form, bankName: text })}
              errorMessage={errors.bankName}
              accessibilityLabel="Nombre del banco de la enfermera"
            />

            <FormInput
              testID="admin-edit-nurse-account-input"
              label="Número de cuenta"
              placeholder="Número de cuenta bancaria (opcional)"
              value={form.accountNumber ?? ""}
              onChangeText={(text) => setForm({ ...form, accountNumber: text })}
              keyboardType="numeric"
              accessibilityLabel="Número de cuenta bancaria de la enfermera"
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {step > 1 && (
          <Pressable
            style={styles.button}
            onPress={handlePrevious}
            accessibilityRole="button"
            accessibilityLabel="Ir al paso anterior"
          >
            <Text style={styles.buttonText}>Anterior</Text>
          </Pressable>
        )}
        {step === 1 && (
          <Pressable
            style={styles.button}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancelar edición del perfil"
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </Pressable>
        )}
        {step < 3 && (
          <Pressable
            style={styles.buttonPrimary}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel="Continuar al siguiente paso"
          >
            <Text style={styles.buttonPrimaryText}>Siguiente</Text>
          </Pressable>
        )}
        {step === 3 && (
          <Pressable
            style={styles.buttonPrimary}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={submitting ? "Guardando perfil de enfermera" : "Guardar perfil de enfermera"}
          >
            <Text style={styles.buttonPrimaryText}>{submitting ? "Guardando..." : "Guardar"}</Text>
          </Pressable>
        )}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  loading: { color: designTokens.color.ink.secondary, fontSize: 14, textAlign: "center", padding: 20 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  stepIndicator: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 12, padding: 12, marginBottom: 12 },
  stepText: { color: designTokens.color.ink.primary, fontSize: 14, fontWeight: "700", textAlign: "center" },
  card: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 8 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { flex: 1, backgroundColor: designTokens.color.surface.secondary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: designTokens.color.ink.primary, fontWeight: "700", fontSize: 16 },
  buttonPrimary: { flex: 1, backgroundColor: designTokens.color.ink.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 16 },
});
