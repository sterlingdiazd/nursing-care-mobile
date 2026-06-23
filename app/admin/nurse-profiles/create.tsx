import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  createNurseProfileForAdmin,
  type CreateNurseProfileRequest,
} from "@/src/services/adminPortalService";
import { getNurseProfileOptions } from "@/src/services/catalogOptionsService";
import type { CatalogCodeNameOption } from "@/src/types/catalog";
import { DateField, FormInput, FormSwitch } from "@/src/components/form";
import { FormButton } from "@/src/components/form/FormButton";
import { adminTestIds } from "@/src/testing/testIds";
import { getAdminNurseCreateProgress } from "@/src/utils/adminCreationUx";
import { mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";

// Legal working days per month under the DR 44-hour week (Código de Trabajo):
// 8h Mon–Fri + 4h Sat = 5.5 days/week × 52 ÷ 12 = 23.83 — the standard divisor for daily/hourly pay.
const DR_WORKING_DAYS_PER_MONTH = 23.83;

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
    accountType: "",
    accountHolderName: "",
    category: "",
    isOperationallyActive: true,
    visitDailyRate: 0,
    homeCareMonthlyRate: 0,
    homeCareMonthlyExpectedDays: DR_WORKING_DAYS_PER_MONTH,
    optInWhatsApp: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // UI States
  const [showBankingInfo, setShowBankingInfo] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<CatalogCodeNameOption[]>([]);
  const [specialtyOptions, setSpecialtyOptions] = useState<CatalogCodeNameOption[]>([]);
  const [catalogFetchError, setCatalogFetchError] = useState(false);

  // Extracted so both the initial mount effect and the retry handler use the same logic.
  const fetchCatalogOptions = () => {
    setOptionsLoading(true);
    setCatalogFetchError(false);
    void getNurseProfileOptions()
      .then((response) => {
        setCategoryOptions(response.categories);
        setSpecialtyOptions(response.specialties);
        AccessibilityInfo.announceForAccessibility('Opciones cargadas.');
      })
      .catch(() => {
        setCategoryOptions([]);
        setSpecialtyOptions([]);
        setCatalogFetchError(true);
        AccessibilityInfo.announceForAccessibility('No se pudieron cargar las opciones del catálogo.');
      })
      .finally(() => setOptionsLoading(false));
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  useEffect(() => {
    fetchCatalogOptions();
  // fetchCatalogOptions is stable (only calls setState setters); empty deps array is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      hapticFeedback.error();
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
          disabled={submitting || optionsLoading}
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

          <View style={{ flexDirection: "row", gap: designTokens.spacing.md }}>
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

          <FormSwitch
            testID="admin-create-nurse-whatsapp-opt-in"
            label="Recibir comprobantes por WhatsApp"
            description="La enfermera consiente recibir sus comprobantes de pago por WhatsApp."
            value={form.optInWhatsApp ?? false}
            onValueChange={(val) => setForm({ ...form, optInWhatsApp: val })}
          />

          <View style={{ flexDirection: "row", gap: designTokens.spacing.md }}>
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
              onPress={() => {
                hapticFeedback.selection();
                setForm({ ...form, isOperationallyActive: true });
              }}
              accessibilityRole="button"
              accessibilityLabel="Marcar enfermera como activa"
              accessibilityState={{ selected: form.isOperationallyActive }}
            >
              <Text style={[styles.chipText, form.isOperationallyActive && styles.chipTextSuccess]}>Activa</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, !form.isOperationallyActive && styles.chipDanger]}
              onPress={() => {
                hapticFeedback.selection();
                setForm({ ...form, isOperationallyActive: false });
              }}
              accessibilityRole="button"
              accessibilityLabel="Marcar enfermera como inactiva"
              accessibilityState={{ selected: !form.isOperationallyActive }}
            >
              <Text style={[styles.chipText, !form.isOperationallyActive && styles.chipTextDanger]}>Inactiva</Text>
            </Pressable>
          </View>

          {/* accessibilityRole="button"+selected is iOS-safe; "radio"+"checked" is broken on iOS ≥ RN 0.73 (github.com/facebook/react-native/issues/43266) */}
          <Text style={styles.cardLabel}>Categoría *</Text>
          <View
            testID={adminTestIds.nurses.create.categoryInput}
            nativeID={adminTestIds.nurses.create.categoryInput}
            accessibilityLabel="Categoría"
            accessibilityLiveRegion="polite"
            style={styles.chipsContainer}
          >
            {optionsLoading ? (
              <Text style={styles.helperText}>Cargando...</Text>
            ) : catalogFetchError ? (
              <>
                <Text style={styles.catalogErrorText}>
                  No se pudieron cargar las opciones. Intente de nuevo.
                </Text>
                <Pressable onPress={fetchCatalogOptions} accessibilityRole="button" accessibilityLabel="Reintentar carga de opciones" style={styles.retryPressable}>
                  <Text style={{ color: designTokens.color.ink.accent }}>Reintentar</Text>
                </Pressable>
              </>
            ) : categoryOptions.length === 0 ? (
              <Text style={styles.helperText}>No hay opciones disponibles en el catálogo.</Text>
            ) : (
              categoryOptions.map((opt) => (
                <Pressable
                  key={opt.code}
                  style={[styles.chip, form.category === opt.code && styles.chipActive]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setForm({ ...form, category: opt.code });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.displayName}
                  accessibilityState={{ selected: form.category === opt.code }}
                >
                  <Text style={[styles.chipText, form.category === opt.code && styles.chipTextActive]}>{opt.displayName}</Text>
                </Pressable>
              ))
            )}
          </View>
          {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

          <Text style={styles.cardLabel}>Especialidad *</Text>
          <View
            testID={adminTestIds.nurses.create.specialtyInput}
            nativeID={adminTestIds.nurses.create.specialtyInput}
            accessibilityLabel="Especialidad"
            accessibilityLiveRegion="polite"
            style={styles.chipsContainer}
          >
            {optionsLoading ? (
              <Text style={styles.helperText}>Cargando...</Text>
            ) : catalogFetchError ? (
              <>
                <Text style={styles.catalogErrorText}>
                  No se pudieron cargar las opciones. Intente de nuevo.
                </Text>
                <Pressable onPress={fetchCatalogOptions} accessibilityRole="button" accessibilityLabel="Reintentar carga de opciones" style={styles.retryPressable}>
                  <Text style={{ color: designTokens.color.ink.accent }}>Reintentar</Text>
                </Pressable>
              </>
            ) : specialtyOptions.length === 0 ? (
              <Text style={styles.helperText}>No hay opciones disponibles en el catálogo.</Text>
            ) : (
              specialtyOptions.map((opt) => (
                <Pressable
                  key={opt.code}
                  style={[styles.chip, form.specialty === opt.code && styles.chipActive]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setForm({ ...form, specialty: opt.code });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.displayName}
                  accessibilityState={{ selected: form.specialty === opt.code }}
                >
                  <Text style={[styles.chipText, form.specialty === opt.code && styles.chipTextActive]}>{opt.displayName}</Text>
                </Pressable>
              ))
            )}
          </View>
          {errors.specialty ? <Text style={styles.errorText}>{errors.specialty}</Text> : null}

          <FormInput
            testID={adminTestIds.nurses.create.licenseInput}
            label="Licencia / Exequátur"
            accessibilityLabel="Número de licencia o exequátur"
            placeholder="(Opcional)"
            value={form.licenseId ?? ""}
            onChangeText={(text) => setForm({ ...form, licenseId: text })}
          />

          <DateField
            testID={adminTestIds.nurses.create.hireDateInput}
            label="Fecha de contratación"
            required
            accessibilityLabel="Fecha de contratación"
            value={form.hireDate}
            onChange={(iso) => setForm({ ...form, hireDate: iso })}
            errorMessage={errors.hireDate}
          />
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

          <View style={{ flexDirection: "row", gap: designTokens.spacing.md }}>
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
              placeholder="23.83"
              keyboardType="numeric"
              value={form.homeCareMonthlyExpectedDays ? String(form.homeCareMonthlyExpectedDays) : ""}
              onChangeText={(text) => setForm({ ...form, homeCareMonthlyExpectedDays: Number(text.replace(/[^0-9.]/g, "")) || DR_WORKING_DAYS_PER_MONTH })}
            />
          </View>
        </View>

        {/* === SECTION: BANKING === */}
        <View style={styles.accordionWrap}>
          <Pressable
            style={styles.accordionHeader}
            onPress={() => {
              hapticFeedback.selection();
              setShowBankingInfo(!showBankingInfo);
            }}
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
              <FormInput
                testID="nurse-create-account-type-input"
                label="Tipo de cuenta (ahorro / corriente)"
                accessibilityLabel="Tipo de cuenta"
                placeholder="ahorro o corriente"
                value={form.accountType ?? ""}
                onChangeText={(text) => setForm({ ...form, accountType: text })}
              />
              <FormInput
                testID="nurse-create-account-holder-input"
                label="Titular de la cuenta"
                accessibilityLabel="Nombre del titular de la cuenta"
                placeholder="Nombre del titular (si difiere de la enfermera)"
                value={form.accountHolderName ?? ""}
                onChangeText={(text) => setForm({ ...form, accountHolderName: text })}
              />
            </View>
          )}
        </View>

      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: designTokens.spacing.md, borderRadius: designTokens.radius.md, marginBottom: designTokens.spacing.md },
  progressPanel: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: designTokens.radius.lg, padding: designTokens.spacing.lg, marginBottom: designTokens.spacing.md, gap: designTokens.spacing.sm },
  progressChip: { alignSelf: "flex-start", borderRadius: designTokens.radius.pill, paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800" },
  progressChipWarning: { backgroundColor: designTokens.color.status.warningBg, color: designTokens.color.status.warningText },
  progressChipSuccess: { backgroundColor: designTokens.color.status.successBg, color: designTokens.color.status.successText },
  progressHelper: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.label.fontSize, lineHeight: 18 },
  formScroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: designTokens.spacing.xxl },
  card: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: designTokens.radius.lg, padding: designTokens.spacing.lg, marginBottom: designTokens.spacing.md },
  cardTitle: { fontSize: designTokens.typography.section.fontSize, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: designTokens.spacing.sm },
  cardLabel: { fontSize: designTokens.typography.label.fontSize, fontWeight: "700", color: designTokens.color.ink.primary, marginBottom: designTokens.spacing.sm, marginTop: designTokens.spacing.xs },
  errorText: { color: designTokens.color.ink.danger, fontSize: designTokens.typography.caption.fontSize, marginTop: designTokens.spacing.xs },
  helperText: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.caption.fontSize, marginTop: designTokens.spacing.xs, marginBottom: designTokens.spacing.xs },

  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm, marginBottom: designTokens.spacing.xs },
  chip: { backgroundColor: designTokens.color.surface.secondary, paddingVertical: designTokens.spacing.md, paddingHorizontal: designTokens.spacing.lg, borderRadius: designTokens.radius.xl, borderWidth: 1, borderColor: designTokens.color.border.subtle, minHeight: 44, justifyContent: "center" },
  chipActive: { backgroundColor: designTokens.color.ink.accent, borderColor: designTokens.color.ink.accentStrong },
  chipSuccess: { backgroundColor: designTokens.color.surface.success, borderColor: designTokens.color.border.subtle },
  chipDanger: { backgroundColor: designTokens.color.surface.danger, borderColor: designTokens.color.ink.danger },
  chipText: { color: designTokens.color.ink.secondary, fontWeight: "600", fontSize: designTokens.typography.body.fontSize },
  chipTextActive: { color: designTokens.color.ink.inverse },
  chipTextSuccess: { color: designTokens.color.status.successText },
  chipTextDanger: { color: designTokens.color.status.dangerText },

  accordionWrap: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: designTokens.radius.lg, overflow: "hidden", marginBottom: designTokens.spacing.md },
  accordionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: designTokens.spacing.lg, backgroundColor: designTokens.color.surface.canvas },
  accordionTitle: { fontSize: designTokens.typography.body.fontSize, fontWeight: "700", color: designTokens.color.ink.secondary },
  accordionIcon: { fontSize: designTokens.typography.body.fontSize, color: designTokens.color.ink.secondary, fontWeight: "700" },
  accordionContent: { padding: designTokens.spacing.lg, borderTopWidth: 1, borderTopColor: designTokens.color.border.subtle },
  catalogErrorText: { color: designTokens.color.ink.danger, marginBottom: designTokens.spacing.sm },
  retryPressable: { paddingVertical: designTokens.spacing.sm, minHeight: 44, justifyContent: 'center' },
});
