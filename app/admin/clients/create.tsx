import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { validateEmail } from "@/src/api/auth";
import { FormInput } from "@/src/components/form";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  createAdminClient,
  type CreateAdminClientRequest,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import {
  getExactDigitsFieldError,
  getRejectedDigitsOnlyInputError,
  getRejectedTextOnlyInputError,
  getTextOnlyFieldError,
  sanitizeDigitsOnlyInput,
  sanitizeTextOnlyInput,
} from "@/src/utils/identityValidation";

export default function AdminCreateClientScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateAdminClientRequest>({
    name: "",
    lastName: "",
    identificationNumber: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const trimmedEmail = form.email.trim();

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

    const identificationInputError = getRejectedDigitsOnlyInputError(form.identificationNumber, "La cédula", 11);
    if (identificationInputError) newErrors.identificationNumber = identificationInputError;
    else {
      const nextIdentificationError = getExactDigitsFieldError(form.identificationNumber, "La cédula", 11);
      if (nextIdentificationError) newErrors.identificationNumber = nextIdentificationError;
    }

    const phoneInputError = getRejectedDigitsOnlyInputError(form.phone, "El teléfono", 10);
    if (phoneInputError) newErrors.phone = phoneInputError;
    else {
      const nextPhoneError = getExactDigitsFieldError(form.phone, "El teléfono", 10);
      if (nextPhoneError) newErrors.phone = nextPhoneError;
    }

    if (!trimmedEmail) newErrors.email = "El correo electrónico es obligatorio";
    else if (!validateEmail(trimmedEmail)) newErrors.email = "El correo debe ser válido";

    if (!form.password.trim()) newErrors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) newErrors.password = "La contraseña debe tener al menos 8 caracteres";

    if (!form.confirmPassword.trim()) newErrors.confirmPassword = "Debes confirmar la contraseña";
    else if (form.confirmPassword !== form.password) newErrors.confirmPassword = "Las contraseñas no coinciden";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setError("Por favor revise los campos en rojo.");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const result = await createAdminClient(form);
      const createdClientUserId = result.userId?.trim();

      if (!createdClientUserId) {
        throw new Error("El cliente fue creado, pero no se recibió el identificador para abrir el detalle.");
      }

      Alert.alert(
        "Cliente creado",
        "La cuenta del cliente se creó correctamente y ya está lista para gestión administrativa.",
        [
          {
            text: "Ver detalle",
            onPress: () => router.replace(`/admin/clients/${createdClientUserId}` as never),
          },
        ],
        { cancelable: false },
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible crear el cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Clientes"
      title="Nuevo cliente"
      description="Registra identidad y credenciales para habilitar la gestión administrativa."
      testID={adminTestIds.clients.create.screen}
      nativeID={adminTestIds.clients.create.screen}
    >
      <Text
        style={styles.progressChip}
        testID={adminTestIds.clients.create.progressChip}
        nativeID={adminTestIds.clients.create.progressChip}
      >
        Paso 1 de 1 • Validar identidad y acceso
      </Text>

      {!!error && (
        <Text
          style={styles.errorBanner}
          testID={adminTestIds.clients.create.errorBanner}
          nativeID={adminTestIds.clients.create.errorBanner}
        >
          {error}
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionHeading}>Información personal</Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Nombre *</Text>
            <FormInput
              testID={adminTestIds.clients.create.nameInput}
              style={[styles.input, errors.name ? styles.inputError : undefined]}
              placeholder="Nombre"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: sanitizeTextOnlyInput(text) })}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>Apellido *</Text>
            <FormInput
              testID={adminTestIds.clients.create.lastNameInput}
              style={[styles.input, errors.lastName ? styles.inputError : undefined]}
              placeholder="Apellido"
              value={form.lastName}
              onChangeText={(text) => setForm({ ...form, lastName: sanitizeTextOnlyInput(text) })}
            />
            {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
          </View>
        </View>

        <Text style={styles.label}>Cédula *</Text>
        <FormInput
          testID={adminTestIds.clients.create.identificationInput}
          style={[styles.input, errors.identificationNumber ? styles.inputError : undefined]}
          placeholder="00112345678"
          value={form.identificationNumber}
          onChangeText={(text) => setForm({ ...form, identificationNumber: sanitizeDigitsOnlyInput(text, 11) })}
          keyboardType="number-pad"
          maxLength={11}
        />
        {errors.identificationNumber ? <Text style={styles.errorText}>{errors.identificationNumber}</Text> : null}

        <Text style={styles.label}>Teléfono *</Text>
        <FormInput
          testID={adminTestIds.clients.create.phoneInput}
          style={[styles.input, errors.phone ? styles.inputError : undefined]}
          placeholder="8091234567"
          value={form.phone}
          onChangeText={(text) => setForm({ ...form, phone: sanitizeDigitsOnlyInput(text, 10) })}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeading}>Credenciales de acceso</Text>

        <Text style={styles.label}>Correo electrónico *</Text>
        <FormInput
          testID={adminTestIds.clients.create.emailInput}
          style={[styles.input, errors.email ? styles.inputError : undefined]}
          placeholder="correo@ejemplo.com"
          value={form.email}
          onChangeText={(text) => setForm({ ...form, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Contraseña *</Text>
            <FormInput
              testID={adminTestIds.clients.create.passwordInput}
              style={[styles.input, errors.password ? styles.inputError : undefined]}
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              secureTextEntry
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>Confirmar *</Text>
            <FormInput
              testID={adminTestIds.clients.create.confirmPasswordInput}
              style={[styles.input, errors.confirmPassword ? styles.inputError : undefined]}
              placeholder="Confirmar contraseña"
              value={form.confirmPassword}
              onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
              secureTextEntry
            />
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.submitButton, submitting ? styles.submitButtonDisabled : undefined]}
        onPress={handleSubmit}
        disabled={submitting}
        testID={adminTestIds.clients.create.submitButton}
        nativeID={adminTestIds.clients.create.submitButton}
      >
        <Text style={styles.submitButtonText}>{submitting ? "Procesando..." : "Registrar cliente"}</Text>
      </Pressable>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  progressChip: {
    ...designTokens.typography.label,
    alignSelf: "flex-start",
    backgroundColor: designTokens.color.status.infoBg,
    color: designTokens.color.status.infoText,
    borderRadius: designTokens.radius.pill,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.md,
  },
  errorBanner: {
    ...designTokens.typography.body,
    backgroundColor: designTokens.color.surface.danger,
    color: designTokens.color.ink.danger,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.md,
  },
  card: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  },
  sectionHeading: {
    ...designTokens.typography.sectionTitle,
    fontSize: 16,
    marginBottom: designTokens.spacing.sm,
  },
  label: {
    ...designTokens.typography.label,
    marginTop: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.xs,
  },
  input: {
    ...designTokens.typography.body,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
  },
  inputError: { borderColor: designTokens.color.border.danger },
  errorText: {
    ...designTokens.typography.body,
    fontSize: 12,
    color: designTokens.color.ink.danger,
    marginTop: designTokens.spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
  },
  col: { flex: 1 },
  submitButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    borderRadius: designTokens.radius.md,
    paddingVertical: designTokens.spacing.md,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    ...designTokens.typography.label,
    color: designTokens.color.surface.primary,
    fontSize: 16,
  },
});
