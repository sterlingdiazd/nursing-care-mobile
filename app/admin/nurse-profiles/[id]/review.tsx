import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getNurseProfileForAdmin,
  completeNurseProfileForAdmin,
  type NurseProfileAdminRecordDto,
  type CompleteNurseProfileRequest,
} from "@/src/services/adminPortalService";

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminReviewNurseProfileScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<NurseProfileAdminRecordDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CompleteNurseProfileRequest>({
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
    if (!roles.includes("Admin")) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.specialty.trim()) newErrors.specialty = "La especialidad es obligatoria";
    if (!form.licenseId?.trim()) newErrors.licenseId = "La licencia es obligatoria";
    if (!form.bankName.trim()) newErrors.bankName = "El banco es obligatorio";
    if (!form.accountNumber?.trim()) newErrors.accountNumber = "El número de cuenta es obligatorio";
    if (!form.category.trim()) newErrors.category = "La categoría es obligatoria";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) return;

    try {
      setSubmitError(null);
      setSubmitting(true);
      await completeNurseProfileForAdmin(id, form);
      router.replace(`/admin/nurse-profiles/${id}` as never);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No fue posible completar el perfil de la enfermera.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("Admin")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Revisar Perfil"
      title="Completar perfil de enfermera"
      description="Revisar la información pendiente y completar los campos requeridos."
    >
      {!!loadError && <Text style={styles.error}>{loadError}</Text>}
      {!!submitError && <Text style={styles.error}>{submitError}</Text>}
      {loading && <Text style={styles.loading}>Cargando...</Text>}

      <ScrollView>
        {profile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Existente</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre completo</Text>
              <Text style={styles.fieldValue}>{profile.name} {profile.lastName}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo electrónico</Text>
              <Text style={styles.fieldValue}>{profile.email}</Text>
            </View>
            {profile.identificationNumber && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Cédula</Text>
                <Text style={styles.fieldValue}>{profile.identificationNumber}</Text>
              </View>
            )}
            {profile.phone && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Teléfono</Text>
                <Text style={styles.fieldValue}>{profile.phone}</Text>
              </View>
            )}
            {profile.hireDate && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Fecha de contratación</Text>
                <Text style={styles.fieldValue}>{formatDate(profile.hireDate)}</Text>
              </View>
            )}
            {profile.specialty && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Especialidad</Text>
                <Text style={styles.fieldValue}>{profile.specialty}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Completar Información</Text>

          <Text style={styles.label}>Especialidad *</Text>
          <TextInput
            style={[styles.input, errors.specialty ? styles.inputError : undefined]}
            placeholder="Especialidad de la enfermera"
            value={form.specialty}
            onChangeText={(text) => setForm({ ...form, specialty: text })}
          />
          {errors.specialty && <Text style={styles.errorText}>{errors.specialty}</Text>}

          <Text style={styles.label}>Licencia *</Text>
          <TextInput
            style={[styles.input, errors.licenseId ? styles.inputError : undefined]}
            placeholder="Número de licencia profesional"
            value={form.licenseId ?? ""}
            onChangeText={(text) => setForm({ ...form, licenseId: text })}
          />
          {errors.licenseId && <Text style={styles.errorText}>{errors.licenseId}</Text>}

          <Text style={styles.label}>Banco *</Text>
          <TextInput
            style={[styles.input, errors.bankName ? styles.inputError : undefined]}
            placeholder="Nombre del banco"
            value={form.bankName}
            onChangeText={(text) => setForm({ ...form, bankName: text })}
          />
          {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}

          <Text style={styles.label}>Número de cuenta *</Text>
          <TextInput
            style={[styles.input, errors.accountNumber ? styles.inputError : undefined]}
            placeholder="Número de cuenta bancaria"
            value={form.accountNumber ?? ""}
            onChangeText={(text) => setForm({ ...form, accountNumber: text })}
          />
          {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}

          <Text style={styles.label}>Categoría *</Text>
          <TextInput
            style={[styles.input, errors.category ? styles.inputError : undefined]}
            placeholder="Categoría profesional"
            value={form.category}
            onChangeText={(text) => setForm({ ...form, category: text })}
          />
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Cancelar</Text>
        </Pressable>
        <Pressable style={styles.buttonPrimary} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.buttonPrimaryText}>{submitting ? "Guardando..." : "Completar Perfil"}</Text>
        </Pressable>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  loading: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#102a43", marginBottom: 12 },
  field: { marginBottom: 8 },
  fieldLabel: { color: "#7c2d12", fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  fieldValue: { color: "#102a43", fontSize: 15 },
  label: { fontSize: 14, fontWeight: "700", color: "#7c2d12", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 12, padding: 12, fontSize: 15, color: "#102a43", backgroundColor: "#fff" },
  inputError: { borderColor: "#c00" },
  errorText: { color: "#c00", fontSize: 12, marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { flex: 1, backgroundColor: "#f0f4f8", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 16 },
  buttonPrimary: { flex: 1, backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});
