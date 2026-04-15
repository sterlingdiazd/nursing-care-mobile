import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { validateEmail } from "@/src/api/auth";
import { useAuth } from "@/src/context/AuthContext";
import {
  createAdminClient,
  type CreateAdminClientRequest,
} from "@/src/services/adminPortalService";
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
    if (!validate()) return;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Crear Cliente"
      title="Nuevo cliente"
      description="Crear una cuenta de cliente con todos los datos requeridos."
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      <ScrollView>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información Personal</Text>

          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : undefined]}
            placeholder="Nombre del cliente"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: sanitizeTextOnlyInput(text) })}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={styles.label}>Apellido *</Text>
          <TextInput
            style={[styles.input, errors.lastName ? styles.inputError : undefined]}
            placeholder="Apellido del cliente"
            value={form.lastName}
            onChangeText={(text) => setForm({ ...form, lastName: sanitizeTextOnlyInput(text) })}
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

          <Text style={styles.label}>Número de identificación *</Text>
          <TextInput
            style={[styles.input, errors.identificationNumber ? styles.inputError : undefined]}
            placeholder="Número de identificación"
            value={form.identificationNumber}
            onChangeText={(text) => setForm({ ...form, identificationNumber: sanitizeDigitsOnlyInput(text, 11) })}
            keyboardType="number-pad"
            maxLength={11}
          />
          {errors.identificationNumber && <Text style={styles.errorText}>{errors.identificationNumber}</Text>}

          <Text style={styles.label}>Teléfono *</Text>
          <TextInput
            style={[styles.input, errors.phone ? styles.inputError : undefined]}
            placeholder="Número de teléfono"
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: sanitizeDigitsOnlyInput(text, 10) })}
            keyboardType="phone-pad"
            maxLength={10}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <Text style={styles.label}>Correo electrónico *</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : undefined]}
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={styles.label}>Contraseña *</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : undefined]}
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChangeText={(text) => setForm({ ...form, password: text })}
            secureTextEntry
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <Text style={styles.label}>Confirmar contraseña *</Text>
          <TextInput
            style={[styles.input, errors.confirmPassword ? styles.inputError : undefined]}
            placeholder="Repetir contraseña"
            value={form.confirmPassword}
            onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
            secureTextEntry
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.buttonPrimary} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.buttonPrimaryText}>{submitting ? "Creando..." : "Crear cliente"}</Text>
        </Pressable>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#102a43", marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "700", color: "#7c2d12", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, padding: 12, fontSize: 15 },
  inputError: { borderColor: "#c00" },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  actions: { marginTop: 16 },
  buttonPrimary: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});
