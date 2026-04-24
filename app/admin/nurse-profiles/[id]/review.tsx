import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  getNurseProfileForAdmin,
  completeNurseProfileForAdmin,
  type NurseProfileAdminRecordDto,
  type CompleteNurseProfileRequest,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { getAdminNurseReviewProgress } from "@/src/utils/adminCreationUx";

const CATEGORIES = ["Auxiliar", "Tecnico", "Profesional", "Especialista"];

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
  const reviewProgress = getAdminNurseReviewProgress(form);

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

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Revisar Perfil"
      title="Completar perfil de enfermera"
      description="Revisar la información pendiente y completar los campos requeridos."
      testID={adminTestIds.nurses.review.screen}
      nativeID={adminTestIds.nurses.review.screen}
    >
      <View style={styles.statusPanel}>
        <Text
          testID={adminTestIds.nurses.review.statusChip}
          nativeID={adminTestIds.nurses.review.statusChip}
          style={[styles.statusChip, reviewProgress.ready ? styles.statusChipSuccess : styles.statusChipWarning]}
        >
          {reviewProgress.status.label}
        </Text>
        <Text style={styles.statusHelper}>{reviewProgress.status.helper}</Text>
      </View>

      {!!loadError && <Text testID={adminTestIds.nurses.review.errorBanner} nativeID={adminTestIds.nurses.review.errorBanner} style={styles.error}>{loadError}</Text>}
      {!!submitError && <Text testID={adminTestIds.nurses.review.errorBanner} nativeID={adminTestIds.nurses.review.errorBanner} style={styles.error}>{submitError}</Text>}
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
          <Text style={styles.cardTitle}>Checklist de aprobación</Text>
          <Text style={styles.reviewNote}>
            {reviewProgress.ready
              ? "La información requerida está completa y la enfermera puede quedar lista para asignaciones."
              : "Completa estos campos antes de activar a la enfermera para trabajo operativo."}
          </Text>
          {reviewProgress.missingLabels.length > 0 ? (
            <View style={styles.missingList}>
              {reviewProgress.missingLabels.map((item) => (
                <Text key={item} style={styles.missingItem}>• {item}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.readyItem}>Todo listo para activar.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Completar Información Operativa</Text>

          <Text style={styles.label}>Especialidad *</Text>
          <TextInput
            testID={adminTestIds.nurses.review.specialtyInput}
            nativeID={adminTestIds.nurses.review.specialtyInput}
            accessibilityLabel="Especialidad de la enfermera"
            style={[styles.input, errors.specialty ? styles.inputError : undefined]}
            placeholder="Especialidad de la enfermera"
            value={form.specialty}
            onChangeText={(text) => setForm({ ...form, specialty: text })}
          />
          {errors.specialty && <Text style={styles.errorText}>{errors.specialty}</Text>}

          <Text style={styles.label}>Licencia *</Text>
          <TextInput
            testID={adminTestIds.nurses.review.licenseInput}
            nativeID={adminTestIds.nurses.review.licenseInput}
            accessibilityLabel="Número de licencia profesional"
            style={[styles.input, errors.licenseId ? styles.inputError : undefined]}
            placeholder="Número de licencia profesional"
            value={form.licenseId ?? ""}
            onChangeText={(text) => setForm({ ...form, licenseId: text })}
          />
          {errors.licenseId && <Text style={styles.errorText}>{errors.licenseId}</Text>}

          <Text style={styles.label}>Banco *</Text>
          <TextInput
            testID={adminTestIds.nurses.review.bankNameInput}
            nativeID={adminTestIds.nurses.review.bankNameInput}
            accessibilityLabel="Nombre del banco"
            style={[styles.input, errors.bankName ? styles.inputError : undefined]}
            placeholder="Nombre del banco"
            value={form.bankName}
            onChangeText={(text) => setForm({ ...form, bankName: text })}
          />
          {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}

          <Text style={styles.label}>Número de cuenta *</Text>
          <TextInput
            testID={adminTestIds.nurses.review.accountNumberInput}
            nativeID={adminTestIds.nurses.review.accountNumberInput}
            accessibilityLabel="Número de cuenta bancaria"
            style={[styles.input, errors.accountNumber ? styles.inputError : undefined]}
            placeholder="Número de cuenta bancaria"
            value={form.accountNumber ?? ""}
            onChangeText={(text) => setForm({ ...form, accountNumber: text })}
          />
          {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}

          <Text style={styles.label}>Categoría *</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[styles.chip, form.category === category && styles.chipActive]}
                onPress={() => setForm({ ...form, category })}
                accessibilityRole="button"
                accessibilityLabel={`Categoría: ${category}`}
                accessibilityState={{ selected: form.category === category }}
              >
                <Text style={[styles.chipText, form.category === category && styles.chipTextActive]}>{category}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            testID={adminTestIds.nurses.review.categoryInput}
            nativeID={adminTestIds.nurses.review.categoryInput}
            accessibilityLabel="Especificar otra categoría profesional"
            style={[styles.input, errors.category ? styles.inputError : undefined]}
            placeholder="Otra categoría profesional"
            value={CATEGORIES.includes(form.category) ? "" : form.category}
            onChangeText={(text) => setForm({ ...form, category: text })}
          />
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={styles.button}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancelar y volver"
        >
          <Text style={styles.buttonText}>Cancelar</Text>
        </Pressable>
        <Pressable
          testID={adminTestIds.nurses.review.submitButton}
          nativeID={adminTestIds.nurses.review.submitButton}
          style={styles.buttonPrimary}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={submitting ? "Activando perfil" : reviewProgress.ready ? "Activar para asignaciones" : "Completar perfil pendiente"}
          accessibilityState={{ busy: submitting }}
        >
          <Text style={styles.buttonPrimaryText}>
            {submitting ? "Activando..." : reviewProgress.ready ? "Activar para asignaciones" : "Completar perfil pendiente"}
          </Text>
        </Pressable>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  loading: { color: designTokens.color.ink.secondary, fontSize: 14, textAlign: "center", padding: 20 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  statusPanel: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12, gap: 8 },
  statusChip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: "800" },
  statusChipWarning: { backgroundColor: designTokens.color.status.warningBg, color: designTokens.color.status.warningText },
  statusChipSuccess: { backgroundColor: designTokens.color.status.successBg, color: designTokens.color.status.successText },
  statusHelper: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  reviewNote: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  missingList: { gap: 6 },
  missingItem: { color: designTokens.color.ink.primary, fontSize: 14 },
  readyItem: { color: designTokens.color.status.successText, fontSize: 14, fontWeight: "700" },
  field: { marginBottom: 8 },
  fieldLabel: { color: designTokens.color.status.dangerText, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  fieldValue: { color: designTokens.color.ink.primary, fontSize: 15 },
  label: { fontSize: 14, fontWeight: "700", color: designTokens.color.status.dangerText, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 12, padding: 12, fontSize: 15, color: designTokens.color.ink.primary, backgroundColor: designTokens.color.surface.primary },
  inputError: { borderColor: designTokens.color.ink.danger },
  errorText: { color: designTokens.color.ink.danger, fontSize: 12, marginTop: 4 },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { backgroundColor: designTokens.color.surface.secondary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  chipActive: { backgroundColor: designTokens.color.ink.accent, borderColor: designTokens.color.ink.accentStrong },
  chipText: { color: designTokens.color.ink.secondary, fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: designTokens.color.ink.inverse },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  button: { flex: 1, backgroundColor: designTokens.color.surface.secondary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: designTokens.color.ink.primary, fontWeight: "700", fontSize: 16 },
  buttonPrimary: { flex: 1, backgroundColor: designTokens.color.ink.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 16 },
});
