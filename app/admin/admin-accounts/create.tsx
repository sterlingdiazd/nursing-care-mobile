import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { validateEmail } from "@/src/api/auth";
import { useAuth } from "@/src/context/AuthContext";
import { FormInput } from "@/src/components/form";
import { designTokens } from "@/src/design-system/tokens";
import { adminTestIds } from "@/src/testing/testIds";
import {
  createAdminAccount,
  type CreateAdminAccountRequest,
} from "@/src/services/adminPortalService";
import {
  getExactDigitsFieldError,
  getRejectedDigitsOnlyInputError,
  getRejectedTextOnlyInputError,
  getTextOnlyFieldError,
  sanitizeDigitsOnlyInput,
  sanitizeTextOnlyInput,
} from "@/src/utils/identityValidation";

export default function AdminCreateAdminAccountScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CreateAdminAccountRequest>({
    name: "",
    lastName: "",
    identificationNumber: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const identityComplete = Boolean(
    form.name.trim()
      && form.lastName.trim()
      && form.identificationNumber.trim()
      && form.phone.trim(),
  );
  const accessComplete = Boolean(
    form.email.trim()
      && form.password.trim()
      && form.confirmPassword.trim(),
  );
  const reviewLabel = identityComplete && accessComplete
    ? "Privilegios listos para revisión"
    : `${Number(identityComplete) + Number(accessComplete)}/2 bloques listos`;

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const nameInputError = getRejectedTextOnlyInputError(form.name, "El nombre");
    if (nameInputError) newErrors.name = nameInputError;
    else {
      const nextNameError = getTextOnlyFieldError(form.name, "El nombre");
      if (nextNameError) newErrors.name = nextNameError;
    }

    const lastNameInputError = getRejectedTextOnlyInputError(form.lastName, "El apellido");
    if (lastNameInputError) newErrors.lastName = lastNameInputError;
    else {
      const nextLastNameError = getTextOnlyFieldError(form.lastName, "El apellido");
      if (nextLastNameError) newErrors.lastName = nextLastNameError;
    }

    const identificationInputError = getRejectedDigitsOnlyInputError(
      form.identificationNumber,
      "La cedula",
      11,
    );
    if (identificationInputError) newErrors.identificationNumber = identificationInputError;
    else {
      const nextIdentificationError = getExactDigitsFieldError(form.identificationNumber, "La cedula", 11);
      if (nextIdentificationError) newErrors.identificationNumber = nextIdentificationError;
    }

    const phoneInputError = getRejectedDigitsOnlyInputError(form.phone, "El telefono", 10);
    if (phoneInputError) newErrors.phone = phoneInputError;
    else {
      const nextPhoneError = getExactDigitsFieldError(form.phone, "El telefono", 10);
      if (nextPhoneError) newErrors.phone = nextPhoneError;
    }

    if (!form.email.trim()) newErrors.email = "El correo electrónico es obligatorio";
    else if (!validateEmail(form.email.trim())) newErrors.email = "El correo debe ser válido";
    if (!form.password.trim()) newErrors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    if (!form.confirmPassword.trim()) newErrors.confirmPassword = "Debes confirmar la contraseña";
    else if (form.password && form.confirmPassword !== form.password) newErrors.confirmPassword = "Las contraseñas no coinciden";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setError("Corrige los campos marcados antes de crear la cuenta administrativa.");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const result = await createAdminAccount(form);
      router.push(`/admin/users/${result.id}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la cuenta de administrador.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Crear Administrador"
      title="Nueva cuenta de administrador"
      description="Crea la cuenta en bloques y confirma el alcance privilegiado antes del alta."
      testID={adminTestIds.adminAccounts.create.screen}
      nativeID={adminTestIds.adminAccounts.create.screen}
    >
      {!!error && (
        <View
          style={styles.error}
          testID={adminTestIds.adminAccounts.create.errorBanner}
          nativeID={adminTestIds.adminAccounts.create.errorBanner}
        >
          <Text style={styles.errorTitle}>La cuenta administrativa requiere revisión</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.reviewCard}>
        <Text style={styles.reviewEyebrow}>Revisión</Text>
        <Text
          style={styles.reviewChip}
          testID={adminTestIds.adminAccounts.create.reviewChip}
          nativeID={adminTestIds.adminAccounts.create.reviewChip}
        >
          {reviewLabel}
        </Text>
        <Text style={styles.reviewText}>
          Antes de crear la cuenta, confirma identidad, acceso y el impacto de otorgar permisos administrativos.
        </Text>
      </View>

      <ScrollView>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paso 1. Identidad</Text>
          <Text style={styles.cardDescription}>Registra primero la persona que recibirá el acceso administrativo.</Text>

          <Text style={styles.label}>Nombre *</Text>
          <FormInput
            testID={adminTestIds.adminAccounts.create.nameInput}
            style={[styles.input, errors.name ? styles.inputError : undefined]}
            placeholder="Nombre del administrador"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: sanitizeTextOnlyInput(text) })}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={styles.label}>Apellido *</Text>
          <FormInput
            testID={adminTestIds.adminAccounts.create.lastNameInput}
            style={[styles.input, errors.lastName ? styles.inputError : undefined]}
            placeholder="Apellido del administrador"
            value={form.lastName}
            onChangeText={(text) => setForm({ ...form, lastName: sanitizeTextOnlyInput(text) })}
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

          <Text style={styles.label}>Número de identificación *</Text>
          <FormInput
            testID={adminTestIds.adminAccounts.create.identificationInput}
            style={[styles.input, errors.identificationNumber ? styles.inputError : undefined]}
            placeholder="Número de identificación"
            value={form.identificationNumber}
            onChangeText={(text) => setForm({ ...form, identificationNumber: sanitizeDigitsOnlyInput(text, 11) })}
            keyboardType="number-pad"
            maxLength={11}
          />
          {errors.identificationNumber && <Text style={styles.errorText}>{errors.identificationNumber}</Text>}

          <Text style={styles.label}>Teléfono *</Text>
          <FormInput
            testID={adminTestIds.adminAccounts.create.phoneInput}
            style={[styles.input, errors.phone ? styles.inputError : undefined]}
            placeholder="Número de teléfono"
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: sanitizeDigitsOnlyInput(text, 10) })}
            keyboardType="phone-pad"
            maxLength={10}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paso 2. Acceso y revisión final</Text>
          <Text style={styles.cardDescription}>Estas credenciales abren un perfil con permisos altos dentro del portal.</Text>

          <Text style={styles.label}>Correo electrónico *</Text>
          <FormInput
            testID={adminTestIds.adminAccounts.create.emailInput}
            style={[styles.input, errors.email ? styles.inputError : undefined]}
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={styles.label}>Contraseña *</Text>
          <FormInput
            style={[styles.input, errors.password ? styles.inputError : undefined]}
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChangeText={(text) => setForm({ ...form, password: text })}
            secureTextEntry
            testID={adminTestIds.adminAccounts.create.passwordInput}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <Text style={styles.label}>Confirmar contraseña *</Text>
          <FormInput
            testID={adminTestIds.adminAccounts.create.confirmPasswordInput}
            style={[styles.input, errors.confirmPassword ? styles.inputError : undefined]}
            placeholder="Repetir contraseña"
            value={form.confirmPassword}
            onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
            secureTextEntry
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Acción privilegiada</Text>
            <Text style={styles.warningText}>
              Esta cuenta podrá administrar usuarios, revisar operaciones y afectar datos sensibles del sistema.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Crear administrador"
          style={styles.buttonPrimary}
          onPress={handleSubmit}
          disabled={submitting}
          testID={adminTestIds.adminAccounts.create.submitButton}
          nativeID={adminTestIds.adminAccounts.create.submitButton}
        >
          <Text style={styles.buttonPrimaryText}>{submitting ? "Creando..." : "Crear administrador"}</Text>
        </Pressable>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: designTokens.color.surface.danger, borderWidth: 1, borderColor: designTokens.color.border.strong, padding: 14, borderRadius: 16, marginBottom: 12 },
  errorTitle: { color: designTokens.color.status.dangerText, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  card: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 8 },
  cardDescription: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "700", color: designTokens.color.status.dangerText, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 12, padding: 12, fontSize: 15 },
  inputError: { borderColor: designTokens.color.ink.danger },
  errorText: { color: designTokens.color.ink.danger, fontSize: 12, marginTop: 4 },
  reviewCard: { backgroundColor: designTokens.color.surface.canvas, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 14, marginBottom: 12 },
  reviewEyebrow: { color: designTokens.color.status.dangerText, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 6 },
  reviewChip: { alignSelf: "flex-start", backgroundColor: designTokens.color.ink.primary, color: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  reviewText: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18 },
  warningCard: { backgroundColor: designTokens.color.surface.warning, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 14, padding: 12, marginTop: 14 },
  warningTitle: { color: designTokens.color.status.dangerText, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  warningText: { color: designTokens.color.status.dangerText, fontSize: 13, lineHeight: 18 },
  actions: { marginTop: 16 },
  buttonPrimary: { backgroundColor: designTokens.color.ink.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 16 },
});
