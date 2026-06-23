import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { FormInput } from "@/src/components/form";
import { BankSelector } from "@/components/BankSelector";
import { designTokens } from "@/src/design-system/tokens";
import {
  getNurseProfileForAdmin,
  completeNurseProfileForAdmin,
  type NurseProfileAdminRecordDto,
  type CompleteNurseProfileRequest,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { getAdminNurseReviewProgress } from "@/src/utils/adminCreationUx";
import { buildAdminNurseProfileDetailPath, goBackOrReplace } from "@/src/utils/navigationEscapes";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { hapticFeedback } from "@/src/utils/haptics";

const CATEGORIES = ["Auxiliar", "Tecnico", "Profesional", "Especialista"];

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  return formatDateES(value);
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
    if (!form.licenseId?.trim()) newErrors.licenseId = "La licencia es obligatoria";
    if (!form.accountNumber?.trim()) newErrors.accountNumber = "El número de cuenta es obligatorio";
    if (!form.category.trim()) newErrors.category = "La categoría es obligatoria";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) {
      hapticFeedback.error();
      return;
    }
    hapticFeedback.light();

    try {
      setSubmitError(null);
      setSubmitting(true);
      // hireDate is not editable on this form. For a pending nurse with no recorded hire date it
      // would be "", which the backend rejects (empty string is not a valid date). Omit it when
      // empty so the profile can still be activated; a real date is sent through untouched.
      const { hireDate, ...rest } = form;
      const payload = hireDate && hireDate.trim() ? form : (rest as CompleteNurseProfileRequest);
      await completeNurseProfileForAdmin(id, payload);
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

          <FormInput
            testID={adminTestIds.nurses.review.licenseInput}
            nativeID={adminTestIds.nurses.review.licenseInput}
            label="Licencia"
            required
            accessibilityLabel="Número de licencia profesional"
            placeholder="Número de licencia profesional"
            value={form.licenseId ?? ""}
            onChangeText={(text) => setForm({ ...form, licenseId: text })}
            errorMessage={errors.licenseId}
          />

          <BankSelector
            testID={adminTestIds.nurses.review.bankNameInput}
            label="Banco"
            placeholder="Selecciona un banco"
            value={form.bankName}
            onChange={(text) => setForm({ ...form, bankName: text })}
            errorMessage={errors.bankName}
          />

          <FormInput
            testID={adminTestIds.nurses.review.accountNumberInput}
            nativeID={adminTestIds.nurses.review.accountNumberInput}
            label="Número de cuenta"
            required
            accessibilityLabel="Número de cuenta bancaria"
            placeholder="Número de cuenta bancaria"
            value={form.accountNumber ?? ""}
            onChangeText={(text) => setForm({ ...form, accountNumber: text })}
            errorMessage={errors.accountNumber}
          />

          <Text style={styles.label}>Categoría *</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[styles.chip, form.category === category && styles.chipActive]}
                onPress={() => {
                  hapticFeedback.selection();
                  setForm({ ...form, category });
                }}
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
          onPress={() => {
            hapticFeedback.selection();
            if (!id) {
              return;
            }

            goBackOrReplace(router, buildAdminNurseProfileDetailPath(id));
          }}
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
  loading: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.body.fontSize, textAlign: "center", padding: designTokens.spacing.xl },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: designTokens.spacing.md, borderRadius: designTokens.radius.md, marginBottom: designTokens.spacing.md },
  statusPanel: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: designTokens.radius.lg, padding: designTokens.spacing.lg, marginBottom: designTokens.spacing.md, gap: designTokens.spacing.sm },
  statusChip: { alignSelf: "flex-start", borderRadius: designTokens.radius.pill, paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800" },
  statusChipWarning: { backgroundColor: designTokens.color.status.warningBg, color: designTokens.color.status.warningText },
  statusChipSuccess: { backgroundColor: designTokens.color.status.successBg, color: designTokens.color.status.successText },
  statusHelper: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.label.fontSize, lineHeight: 18 },
  card: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: designTokens.radius.lg, padding: designTokens.spacing.lg, marginBottom: designTokens.spacing.md },
  cardTitle: { fontSize: designTokens.typography.body.fontSize, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: designTokens.spacing.md },
  reviewNote: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.label.fontSize, lineHeight: 18, marginBottom: designTokens.spacing.md },
  missingList: { gap: designTokens.spacing.sm },
  missingItem: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.body.fontSize },
  readyItem: { color: designTokens.color.status.successText, fontSize: designTokens.typography.body.fontSize, fontWeight: "700" },
  field: { marginBottom: designTokens.spacing.sm },
  fieldLabel: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800", textTransform: "uppercase", marginBottom: designTokens.spacing.xs },
  fieldValue: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.body.fontSize },
  label: { fontSize: designTokens.typography.body.fontSize, fontWeight: "700", color: designTokens.color.ink.muted, marginTop: designTokens.spacing.md, marginBottom: designTokens.spacing.sm },
  input: { borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: designTokens.radius.md, padding: designTokens.spacing.md, fontSize: designTokens.typography.body.fontSize, color: designTokens.color.ink.primary, backgroundColor: designTokens.color.surface.primary },
  inputError: { borderColor: designTokens.color.ink.danger },
  errorText: { color: designTokens.color.ink.danger, fontSize: designTokens.typography.caption.fontSize, marginTop: designTokens.spacing.xs },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm, marginBottom: designTokens.spacing.xs },
  chip: { backgroundColor: designTokens.color.surface.secondary, paddingVertical: designTokens.spacing.md, paddingHorizontal: designTokens.spacing.lg, borderRadius: designTokens.radius.xl, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  chipActive: { backgroundColor: designTokens.color.ink.accent, borderColor: designTokens.color.ink.accentStrong },
  chipText: { color: designTokens.color.ink.secondary, fontWeight: "600", fontSize: designTokens.typography.body.fontSize },
  chipTextActive: { color: designTokens.color.ink.inverse },
  actions: { flexDirection: "row", gap: designTokens.spacing.sm, marginTop: designTokens.spacing.lg },
  button: { flex: 1, backgroundColor: designTokens.color.surface.secondary, borderRadius: designTokens.radius.md, paddingVertical: designTokens.spacing.lg, alignItems: "center" },
  buttonText: { color: designTokens.color.ink.primary, fontWeight: "700", fontSize: designTokens.typography.body.fontSize },
  buttonPrimary: { flex: 1, backgroundColor: designTokens.color.ink.accent, borderRadius: designTokens.radius.md, paddingVertical: designTokens.spacing.lg, alignItems: "center" },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: designTokens.typography.body.fontSize },
});
