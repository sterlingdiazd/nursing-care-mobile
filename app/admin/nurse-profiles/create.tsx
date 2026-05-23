import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  createNurseProfileForAdmin,
  type CreateNurseProfileRequest,
} from "@/src/services/adminPortalService";
import { FormInput } from "@/src/components/form";
import { FormButton } from "@/src/components/form/FormButton";
import { adminTestIds } from "@/src/testing/testIds";
import { getAdminNurseCreateProgress } from "@/src/utils/adminCreationUx";
import { mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

const CATEGORIES = ["Auxiliar", "Técnico", "Profesional", "Especialista"];

export default function AdminCreateNurseProfileScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CreateNurseProfileRequest>({
    name: "",
    lastName: "",
    identificationNumber: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    hireDate: new Date().toISOString().split("T")[0],
    specialty: "",
    licenseId: "",
    bankName: "",
    accountNumber: "",
    category: CATEGORIES[0],
    isOperationallyActive: true,
    visitDailyRate: 0,
    homeCareMonthlyRate: 0,
    homeCareMonthlyExpectedDays: 30,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // UI States
  const [showBankingInfo, setShowBankingInfo] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!form.lastName.trim()) newErrors.lastName = "El apellido es obligatorio";
    if (!form.identificationNumber.trim()) newErrors.identificationNumber = "La cédula es obligatoria";
    if (!form.phone.trim()) newErrors.phone = "El teléfono es obligatorio";

    if (!form.email.trim()) newErrors.email = "El correo electrónico es obligatorio";
    else if (!form.email.includes("@")) newErrors.email = "El correo debe ser válido";

    if (!form.password.trim()) newErrors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) newErrors.password = "La contraseña debe tener al menos 8 caracteres";

    if (form.password && form.confirmPassword !== form.password) newErrors.confirmPassword = "Las contraseñas no coinciden";

    if (!form.hireDate.trim()) newErrors.hireDate = "La fecha de contratación es obligatoria";
    if (!form.specialty.trim()) newErrors.specialty = "La especialidad es obligatoria";
    if (!form.category.trim()) newErrors.category = "La categoría es obligatoria";

    if (!form.bankName.trim() && form.accountNumber?.trim()) {
      newErrors.bankName = "El banco es obligatorio si se ingresa cuenta";
      // Auto expand to show error
      setShowBankingInfo(true);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAll()) {
      setError("Por favor revise los campos en rojo.");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const result = await createNurseProfileForAdmin(form);
      router.push(`/admin/nurse-profiles/${result.userId}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el perfil de la enfermera.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCategoryIsCustom = !CATEGORIES.includes(form.category);
  const createProgress = getAdminNurseCreateProgress(form);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) return null;

  return (
    <MobileWorkspaceShell
      eyebrow="Crear Perfil"
      title="Nueva enfermera"
      description="Crear perfil rápido y configuraciones base."
      testID={adminTestIds.nurses.create.screen}
      nativeID={adminTestIds.nurses.create.screen}
      primaryReturnPath={mobileNavigationEscapes.adminNurseProfiles}
      primaryReturnLabel="Volver a enfermeras"
      actions={
        <FormButton
          testID={adminTestIds.nurses.create.submitButton}
          variant="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          disabled={submitting}
        >
          Registrar Enfermera
        </FormButton>
      }
      disableScroll
    >
      <View style={styles.progressPanel}>
        <Text
          testID={adminTestIds.nurses.create.progressChip}
          nativeID={adminTestIds.nurses.create.progressChip}
          style={[styles.progressChip, createProgress.ready ? styles.progressChipSuccess : styles.progressChipWarning]}
        >
          {createProgress.status.label}
        </Text>
        <Text style={styles.progressHelper}>{createProgress.status.helper}</Text>
      </View>

      {!!error && <Text testID={adminTestIds.nurses.create.errorBanner} nativeID={adminTestIds.nurses.create.errorBanner} style={styles.error}>{error}</Text>}

      <ScrollView style={styles.formScroll} contentContainerStyle={styles.scrollContent}>
        {/* === SECTION: PERSONAL === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos Básicos</Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <FormInput
              testID={adminTestIds.nurses.create.nameInput}
              label="Nombre"
              required
              containerStyle={{ flex: 1 }}
              accessibilityLabel="Nombre de la enfermera"
              placeholder="Nombre"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              errorMessage={errors.name}
            />
            <FormInput
              testID={adminTestIds.nurses.create.lastNameInput}
              label="Apellido"
              required
              containerStyle={{ flex: 1 }}
              accessibilityLabel="Apellido de la enfermera"
              placeholder="Apellido"
              value={form.lastName}
              onChangeText={(text) => setForm({ ...form, lastName: text })}
              errorMessage={errors.lastName}
            />
          </View>

          <FormInput
            testID={adminTestIds.nurses.create.identificationInput}
            label="Cédula"
            required
            accessibilityLabel="Número de cédula de identidad"
            placeholder="Número de identificación"
            value={form.identificationNumber}
            onChangeText={(text) => setForm({ ...form, identificationNumber: text })}
            keyboardType="numeric"
            errorMessage={errors.identificationNumber}
          />

          <FormInput
            testID={adminTestIds.nurses.create.phoneInput}
            label="Teléfono"
            required
            accessibilityLabel="Número de teléfono"
            placeholder="Ej: 8091234567"
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
            keyboardType="phone-pad"
            errorMessage={errors.phone}
          />

          <FormInput
            testID={adminTestIds.nurses.create.emailInput}
            label="Correo electrónico"
            required
            accessibilityLabel="Correo electrónico de la enfermera"
            placeholder="Enfermera@correo.com"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            errorMessage={errors.email}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <FormInput
              testID={adminTestIds.nurses.create.passwordInput}
              label="Contraseña"
              required
              containerStyle={{ flex: 1 }}
              accessibilityLabel="Contraseña de acceso"
              placeholder="****"
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              secureTextEntry
              errorMessage={errors.password}
            />
            <FormInput
              testID={adminTestIds.nurses.create.confirmPasswordInput}
              label="Confirmar"
              required
              containerStyle={{ flex: 1 }}
              accessibilityLabel="Confirmar contraseña"
              placeholder="****"
              value={form.confirmPassword}
              onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
              secureTextEntry
              errorMessage={errors.confirmPassword}
            />
          </View>
        </View>

        {/* === SECTION: PROFESSIONAL === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Perfil Profesional</Text>

          <Text style={styles.cardLabel}>Estado operacional</Text>
          <View style={styles.chipsContainer}>
            <Pressable
              style={[styles.chip, form.isOperationallyActive && styles.chipSuccess]}
              onPress={() => setForm({ ...form, isOperationallyActive: true })}
              accessibilityRole="button"
              accessibilityLabel="Marcar enfermera como activa"
              accessibilityState={{ selected: form.isOperationallyActive }}
            >
              <Text style={[styles.chipText, form.isOperationallyActive && styles.chipTextSuccess]}>Activa</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, !form.isOperationallyActive && styles.chipDanger]}
              onPress={() => setForm({ ...form, isOperationallyActive: false })}
              accessibilityRole="button"
              accessibilityLabel="Marcar enfermera como inactiva"
              accessibilityState={{ selected: !form.isOperationallyActive }}
            >
              <Text style={[styles.chipText, !form.isOperationallyActive && styles.chipTextDanger]}>Inactiva</Text>
            </Pressable>
          </View>

          <Text style={styles.cardLabel}>Categoría *</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.chip, form.category === cat && styles.chipActive]}
                onPress={() => { setForm({ ...form, category: cat }); setCustomCategory(""); }}
                accessibilityRole="button"
                accessibilityLabel={`Categoría: ${cat}`}
                accessibilityState={{ selected: form.category === cat }}
              >
                <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
          <FormInput
            testID={adminTestIds.nurses.create.categoryInput}
            accessibilityLabel="Especificar otra categoría profesional"
            placeholder="Otra categoría"
            value={activeCategoryIsCustom ? form.category : customCategory}
            onChangeText={(text) => {
              setCustomCategory(text);
              setForm({ ...form, category: text || CATEGORIES[0] });
            }}
            onFocus={() => { if (!activeCategoryIsCustom) setForm({ ...form, category: "" }); }}
            errorMessage={errors.category}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <FormInput
              testID={adminTestIds.nurses.create.specialtyInput}
              label="Especialidad"
              required
              containerStyle={{ flex: 1 }}
              accessibilityLabel="Especialidad profesional"
              placeholder="Ej: Pediatría"
              value={form.specialty}
              onChangeText={(text) => setForm({ ...form, specialty: text })}
              errorMessage={errors.specialty}
            />
            <FormInput
              testID={adminTestIds.nurses.create.licenseInput}
              label="Licencia / Exequátur"
              containerStyle={{ flex: 1 }}
              accessibilityLabel="Número de licencia o exequátur"
              placeholder="(Opcional)"
              value={form.licenseId ?? ""}
              onChangeText={(text) => setForm({ ...form, licenseId: text })}
            />
          </View>

          {Platform.OS === "web" ? (
            <FormInput
              testID={adminTestIds.nurses.create.hireDateInput}
              label="Fecha de contratación"
              required
              accessibilityLabel="Fecha de contratación"
              value={form.hireDate}
              onChangeText={(text) => setForm({ ...form, hireDate: text })}
              errorMessage={errors.hireDate}
              {...({ type: "date" } as any)}
            />
          ) : (
            <FormInput
              testID={adminTestIds.nurses.create.hireDateInput}
              label="Fecha de contratación"
              required
              accessibilityLabel="Fecha de contratación en formato AAAA-MM-DD"
              placeholder="YYYY-MM-DD"
              value={form.hireDate}
              onChangeText={(text) => setForm({ ...form, hireDate: text })}
              errorMessage={errors.hireDate}
            />
          )}
        </View>

        {/* === SECTION: PAGO === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pago a la enfermera</Text>
          <Text style={styles.helperText}>Independiente del precio al cliente. Se paga por días trabajados.</Text>

          <FormInput
            testID="admin-create-nurse-visit-rate-input"
            label="Tarifa por día (domicilio) RD$"
            accessibilityLabel="Tarifa de pago por día para domicilio"
            placeholder="Ej: 1700"
            keyboardType="numeric"
            value={form.visitDailyRate ? String(form.visitDailyRate) : ""}
            onChangeText={(text) => setForm({ ...form, visitDailyRate: Number(text.replace(/[^0-9.]/g, "")) || 0 })}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <FormInput
              testID="admin-create-nurse-home-monthly-input"
              label="Monto mensual (casa hogar) RD$"
              containerStyle={{ flex: 1 }}
              accessibilityLabel="Monto mensual de casa hogar"
              placeholder="Ej: 30000"
              keyboardType="numeric"
              value={form.homeCareMonthlyRate ? String(form.homeCareMonthlyRate) : ""}
              onChangeText={(text) => setForm({ ...form, homeCareMonthlyRate: Number(text.replace(/[^0-9.]/g, "")) || 0 })}
            />
            <FormInput
              testID="admin-create-nurse-home-days-input"
              label="Días esperados/mes"
              containerStyle={{ flex: 1 }}
              accessibilityLabel="Días esperados de trabajo en el mes"
              placeholder="30"
              keyboardType="numeric"
              value={form.homeCareMonthlyExpectedDays ? String(form.homeCareMonthlyExpectedDays) : ""}
              onChangeText={(text) => setForm({ ...form, homeCareMonthlyExpectedDays: Number(text.replace(/[^0-9]/g, "")) || 30 })}
            />
          </View>
        </View>

        {/* === SECTION: BANKING === */}
        <View style={styles.accordionWrap}>
          <Pressable
            style={styles.accordionHeader}
            onPress={() => setShowBankingInfo(!showBankingInfo)}
            accessibilityRole="button"
            accessibilityLabel="Mostrar u ocultar información bancaria"
            accessibilityState={{ expanded: showBankingInfo }}
          >
            <Text style={styles.accordionTitle}>Información Bancaria (Opcional)</Text>
            <Text style={styles.accordionIcon}>{showBankingInfo ? "▲" : "▼"}</Text>
          </Pressable>
          {showBankingInfo && (
            <View style={styles.accordionContent}>
              <FormInput
                testID={adminTestIds.nurses.create.bankNameInput}
                label="Nombre del Banco"
                accessibilityLabel="Nombre del banco"
                placeholder="Ej: Banreservas"
                value={form.bankName}
                onChangeText={(text) => setForm({ ...form, bankName: text })}
                errorMessage={errors.bankName}
              />
              <FormInput
                testID={adminTestIds.nurses.create.accountNumberInput}
                label="Número de Cuenta"
                accessibilityLabel="Número de cuenta bancaria"
                placeholder="Número de cuenta bancaria"
                value={form.accountNumber ?? ""}
                onChangeText={(text) => setForm({ ...form, accountNumber: text })}
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  progressPanel: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12, gap: 8 },
  progressChip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: "800" },
  progressChipWarning: { backgroundColor: designTokens.color.status.warningBg, color: designTokens.color.status.warningText },
  progressChipSuccess: { backgroundColor: designTokens.color.status.successBg, color: designTokens.color.status.successText },
  progressHelper: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18 },
  formScroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 24 },
  card: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 6 },
  cardLabel: { fontSize: 13, fontWeight: "700", color: designTokens.color.ink.primary, marginBottom: 7, marginTop: 4 },
  errorText: { color: designTokens.color.ink.danger, fontSize: 12, marginTop: 4 },
  helperText: { color: designTokens.color.ink.secondary, fontSize: 12, marginTop: 2, marginBottom: 4 },

  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { backgroundColor: designTokens.color.surface.secondary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  chipActive: { backgroundColor: designTokens.color.ink.accent, borderColor: designTokens.color.ink.accentStrong },
  chipSuccess: { backgroundColor: designTokens.color.surface.success, borderColor: designTokens.color.border.subtle },
  chipDanger: { backgroundColor: designTokens.color.surface.danger, borderColor: designTokens.color.ink.danger },
  chipText: { color: designTokens.color.ink.secondary, fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: designTokens.color.ink.inverse },
  chipTextSuccess: { color: designTokens.color.status.successText },
  chipTextDanger: { color: designTokens.color.status.dangerText },

  accordionWrap: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  accordionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: designTokens.color.surface.canvas },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: designTokens.color.ink.secondary },
  accordionIcon: { fontSize: 14, color: designTokens.color.ink.secondary, fontWeight: "700" },
  accordionContent: { padding: 16, borderTopWidth: 1, borderTopColor: designTokens.color.border.subtle },
});
