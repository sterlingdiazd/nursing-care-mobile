import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { validateEmail } from "@/src/api/auth";
import { useAuth } from "@/src/context/AuthContext";
import { Banner } from "@/src/components/shared/Banner";
import { FormButton, FormInput } from "@/src/components/form";
import { FormPanel } from "@/src/components/shared/FormPanel";
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
import { mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

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
      primaryReturnPath={mobileNavigationEscapes.adminUsers}
      primaryReturnLabel="Volver a usuarios"
    >
      <Banner
        tone="error"
        message={error}
        testID={adminTestIds.adminAccounts.create.errorBanner}
      />

      <View
        style={styles.reviewCard}
        testID={adminTestIds.adminAccounts.create.reviewChip}
        nativeID={adminTestIds.adminAccounts.create.reviewChip}
      >
        <Text style={styles.reviewEyebrow}>Revisión</Text>
        <Text style={styles.reviewChip}>
          {reviewLabel}
        </Text>
        <Text style={styles.reviewText}>
          Antes de crear la cuenta, confirma identidad, acceso y el impacto de otorgar permisos administrativos.
        </Text>
      </View>

      <ScrollView>
        <FormPanel
          eyebrow="Paso 1"
          title="Identidad"
          testID="admin-create-identity-panel"
        >
          <FormInput
            testID={adminTestIds.adminAccounts.create.nameInput}
            label="Nombre"
            required
            placeholder="Nombre del administrador"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: sanitizeTextOnlyInput(text) })}
            errorMessage={errors.name}
          />

          <FormInput
            testID={adminTestIds.adminAccounts.create.lastNameInput}
            label="Apellido"
            required
            placeholder="Apellido del administrador"
            value={form.lastName}
            onChangeText={(text) => setForm({ ...form, lastName: sanitizeTextOnlyInput(text) })}
            errorMessage={errors.lastName}
          />

          <FormInput
            testID={adminTestIds.adminAccounts.create.identificationInput}
            label="Número de identificación"
            required
            placeholder="Número de identificación"
            value={form.identificationNumber}
            onChangeText={(text) => setForm({ ...form, identificationNumber: sanitizeDigitsOnlyInput(text, 11) })}
            keyboardType="number-pad"
            maxLength={11}
            errorMessage={errors.identificationNumber}
          />

          <FormInput
            testID={adminTestIds.adminAccounts.create.phoneInput}
            label="Teléfono"
            required
            placeholder="Número de teléfono"
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: sanitizeDigitsOnlyInput(text, 10) })}
            keyboardType="phone-pad"
            maxLength={10}
            errorMessage={errors.phone}
          />
        </FormPanel>

        <FormPanel
          eyebrow="Paso 2"
          title="Acceso y revisión final"
          testID="admin-create-access-panel"
          footer={
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Acción privilegiada</Text>
              <Text style={styles.warningText}>
                Esta cuenta podrá administrar usuarios, revisar operaciones y afectar datos sensibles del sistema.
              </Text>
            </View>
          }
        >
          <FormInput
            testID={adminTestIds.adminAccounts.create.emailInput}
            label="Correo electrónico"
            required
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            errorMessage={errors.email}
          />

          <FormInput
            testID={adminTestIds.adminAccounts.create.passwordInput}
            label="Contraseña"
            required
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChangeText={(text) => setForm({ ...form, password: text })}
            secureTextEntry
            errorMessage={errors.password}
          />

          <FormInput
            testID={adminTestIds.adminAccounts.create.confirmPasswordInput}
            label="Confirmar contraseña"
            required
            placeholder="Repetir contraseña"
            value={form.confirmPassword}
            onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
            secureTextEntry
            errorMessage={errors.confirmPassword}
          />
        </FormPanel>
      </ScrollView>

      <View style={styles.actions}>
        <FormButton
          testID={adminTestIds.adminAccounts.create.submitButton}
          variant="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          disabled={submitting}
          accessibilityLabel="Crear administrador"
        >
          Crear administrador
        </FormButton>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  reviewCard: {
    backgroundColor: designTokens.color.surface.canvas,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  reviewEyebrow: {
    color: designTokens.color.ink.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  reviewChip: {
    alignSelf: "flex-start",
    backgroundColor: designTokens.color.ink.primary,
    color: designTokens.color.ink.inverse,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  reviewText: {
    color: designTokens.color.ink.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: 14,
    padding: 12,
  },
  warningTitle: {
    color: designTokens.color.status.dangerText,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  warningText: {
    color: designTokens.color.status.dangerText,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    marginTop: 16,
  },
});
