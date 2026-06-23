import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { validateEmail } from "@/src/api/auth";
import { FormButton, FormInput } from "@/src/components/form";
import { useToast } from "@/src/components/shared/ToastProvider";
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
import { mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

export default function AdminCreateClientScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState<"cedula" | "passport">("cedula");
  const [form, setForm] = useState<CreateAdminClientRequest>({
    name: "",
    lastName: "",
    identificationNumber: null,
    passportNumber: null,
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

    if (documentType === "cedula") {
      const cedula = form.identificationNumber ?? "";
      const identificationInputError = getRejectedDigitsOnlyInputError(cedula, "La cédula", 11);
      if (identificationInputError) newErrors.identificationNumber = identificationInputError;
      else {
        const nextIdentificationError = getExactDigitsFieldError(cedula, "La cédula", 11);
        if (nextIdentificationError) newErrors.identificationNumber = nextIdentificationError;
      }
    } else {
      const passport = form.passportNumber ?? "";
      if (!passport.trim()) newErrors.identificationNumber = "El pasaporte es obligatorio";
      else if (passport.trim().length > 9) newErrors.identificationNumber = "El pasaporte no puede tener más de 9 dígitos";
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

      showToast({ variant: "success", message: "La cuenta del cliente se creó correctamente y ya está lista para gestión administrativa." });
      router.replace(`/admin/clients/${createdClientUserId}` as never);
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
      primaryReturnPath={mobileNavigationEscapes.adminClients}
      primaryReturnLabel="Volver a clientes"
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

        <View style={{ flexDirection: "row", gap: designTokens.spacing.md }}>
          <FormInput
            testID={adminTestIds.clients.create.nameInput}
            label="Nombre"
            required
            placeholder="Nombre"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: sanitizeTextOnlyInput(text) })}
            errorMessage={errors.name}
            containerStyle={{ flex: 1 }}
          />
          <FormInput
            testID={adminTestIds.clients.create.lastNameInput}
            label="Apellido"
            required
            placeholder="Apellido"
            value={form.lastName}
            onChangeText={(text) => setForm({ ...form, lastName: sanitizeTextOnlyInput(text) })}
            errorMessage={errors.lastName}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Text style={styles.sectionHeading}>Documento de identidad</Text>
        <View style={styles.docToggleRow}>
          <Pressable
            style={[styles.docChip, documentType === "cedula" ? styles.docChipActive : undefined]}
            onPress={() => { setDocumentType("cedula"); setForm({ ...form, passportNumber: null }); }}
            accessibilityRole="button"
            accessibilityLabel="Cédula de identidad"
            accessibilityState={{ selected: documentType === "cedula" }}
            testID="client-create-document-type-cedula"
          >
            <Text style={[styles.docChipText, documentType === "cedula" ? styles.docChipTextActive : undefined]}>Cédula</Text>
          </Pressable>
          <Pressable
            style={[styles.docChip, documentType === "passport" ? styles.docChipActive : undefined]}
            onPress={() => { setDocumentType("passport"); setForm({ ...form, identificationNumber: null }); }}
            accessibilityRole="button"
            accessibilityLabel="Pasaporte"
            accessibilityState={{ selected: documentType === "passport" }}
            testID="client-create-document-type-passport"
          >
            <Text style={[styles.docChipText, documentType === "passport" ? styles.docChipTextActive : undefined]}>Pasaporte</Text>
          </Pressable>
        </View>
        {documentType === "cedula" ? (
          <FormInput
            testID={adminTestIds.clients.create.identificationInput}
            label="Cédula"
            required
            placeholder="00112345678"
            value={form.identificationNumber ?? ""}
            onChangeText={(text) => setForm({ ...form, identificationNumber: sanitizeDigitsOnlyInput(text, 11) })}
            keyboardType="number-pad"
            maxLength={11}
            errorMessage={errors.identificationNumber}
          />
        ) : (
          <FormInput
            testID="client-create-passport-input"
            label="Pasaporte"
            required
            placeholder="Máx. 9 dígitos"
            value={form.passportNumber ?? ""}
            onChangeText={(text) => setForm({ ...form, passportNumber: sanitizeDigitsOnlyInput(text, 9) })}
            keyboardType="number-pad"
            maxLength={9}
            errorMessage={errors.identificationNumber}
          />
        )}

        <FormInput
          testID={adminTestIds.clients.create.phoneInput}
          label="Teléfono"
          required
          placeholder="8091234567"
          value={form.phone}
          onChangeText={(text) => setForm({ ...form, phone: sanitizeDigitsOnlyInput(text, 10) })}
          keyboardType="phone-pad"
          maxLength={10}
          errorMessage={errors.phone}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeading}>Credenciales de acceso</Text>

        <FormInput
          testID={adminTestIds.clients.create.emailInput}
          label="Correo electrónico"
          required
          placeholder="correo@ejemplo.com"
          value={form.email}
          onChangeText={(text) => setForm({ ...form, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          errorMessage={errors.email}
        />

        <View style={{ flexDirection: "row", gap: designTokens.spacing.md }}>
          <FormInput
            testID={adminTestIds.clients.create.passwordInput}
            label="Contraseña"
            required
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChangeText={(text) => setForm({ ...form, password: text })}
            secureTextEntry
            errorMessage={errors.password}
            containerStyle={{ flex: 1 }}
          />
          <FormInput
            testID={adminTestIds.clients.create.confirmPasswordInput}
            label="Confirmar"
            required
            placeholder="Confirmar contraseña"
            value={form.confirmPassword}
            onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
            secureTextEntry
            errorMessage={errors.confirmPassword}
            containerStyle={{ flex: 1 }}
          />
        </View>
      </View>

      <FormButton
        testID={adminTestIds.clients.create.submitButton}
        variant="primary"
        onPress={handleSubmit}
        disabled={submitting}
        isLoading={submitting}
      >
        {submitting ? "Procesando..." : "Registrar cliente"}
      </FormButton>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  progressChip: {
    ...designTokens.typography.label,
    alignSelf: "flex-start",
    backgroundColor: designTokens.color.status.warningBg,
    color: designTokens.color.status.warningText,
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
    fontSize: designTokens.typography.body.fontSize,
    marginBottom: designTokens.spacing.sm,
  },
  docToggleRow: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
  },
  docChip: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    backgroundColor: designTokens.color.surface.secondary,
    minHeight: 36,
    justifyContent: "center" as const,
  },
  docChipActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.ink.accent,
  },
  docChipText: {
    color: designTokens.color.ink.secondary,
    fontWeight: "700" as const,
    fontSize: 14,
  },
  docChipTextActive: {
    color: designTokens.color.ink.inverse,
  },
});
