import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth, UserProfileType } from "@/src/context/AuthContext";
import { validateEmail, validatePassword } from "@/src/api/auth";
import * as Linking from "expo-linking";
import {
  getGoogleOAuthStartUrl,
  getLocalHttpsCertificateWarning,
} from "@/src/services/authService";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileType, setProfileType] = useState<UserProfileType>(UserProfileType.Client);

  // Validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Validation functions
  const validateEmailField = (value: string) => {
    if (!value) {
      setEmailError("El correo es obligatorio");
    } else if (!validateEmail(value)) {
      setEmailError("El formato del correo no es valido");
    } else {
      setEmailError("");
    }
  };

  const validatePasswordField = (value: string) => {
    if (!value) {
      setPasswordError("La contrasena es obligatoria");
    } else {
      const validation = validatePassword(value);
      setPasswordError(validation.isValid ? "" : validation.message);
    }
  };

  const validateConfirmPasswordField = (value: string) => {
    if (!value) {
      setConfirmPasswordError("Confirma tu contrasena");
    } else if (value !== password) {
      setConfirmPasswordError("Las contrasenas no coinciden");
    } else {
      setConfirmPasswordError("");
    }
  };

  // Handle registration submission
  const handleSubmit = async () => {
    // Validate all fields
    if (emailError || passwordError || confirmPasswordError || !email || !password || !confirmPassword) {
      Alert.alert("Validacion", "Corrige los errores antes de enviar el formulario.");
      return;
    }

    try {
      await register(email.trim(), password, confirmPassword, profileType);

      // Show success message based on profile type
      if (profileType === UserProfileType.Nurse) {
        Alert.alert(
        "Registro exitoso",
        "Tu cuenta quedo pendiente de aprobacion administrativa. Recibiras un correo cuando sea activada.",
          [
            {
              text: "Aceptar",
              onPress: () => router.push("/login"),
            },
          ]
        );
      } else {
        Alert.alert(
        "Registro exitoso",
        "Ya puedes iniciar sesion con tus credenciales.",
          [
            {
              text: "Ir a iniciar sesion",
              onPress: () => router.push("/login"),
            },
          ]
        );
      }

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "No fue posible completar el registro";
      Alert.alert("Error de registro", errorMsg);
    }
  };

  const handleGoogleSignIn = async () => {
    const certificateWarning = getLocalHttpsCertificateWarning();

    if (certificateWarning) {
      Alert.alert("Certificado local requerido", certificateWarning);
    }

    try {
      await Linking.openURL(getGoogleOAuthStartUrl("mobile"));
    } catch (error) {
      Alert.alert(
        "Error con Google",
        error instanceof Error ? error.message : "No fue posible abrir el acceso con Google."
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Title */}
      <Text style={styles.title}>Crear cuenta</Text>

      {/* Email Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          onBlur={() => validateEmailField(email)}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      </View>

      {/* Password Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Contrasena</Text>
        <TextInput
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="Minimo 6 caracteres"
          value={password}
          onChangeText={setPassword}
          onBlur={() => validatePasswordField(password)}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      </View>

      {/* Confirm Password Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Confirmar contrasena</Text>
        <TextInput
          style={[styles.input, confirmPasswordError ? styles.inputError : null]}
          placeholder="Vuelve a escribir tu contrasena"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => validateConfirmPasswordField(confirmPassword)}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
      </View>

      {/* Profile Type Selection */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Registrarse como:</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setProfileType(UserProfileType.Client)}
            disabled={isLoading}
          >
            <View
              style={[
                styles.radioButton,
                profileType === UserProfileType.Client ? styles.radioButtonSelected : null,
              ]}
            />
            <Text style={styles.radioLabel}>Cliente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setProfileType(UserProfileType.Nurse)}
            disabled={isLoading}
          >
            <View
              style={[
                styles.radioButton,
                profileType === UserProfileType.Nurse ? styles.radioButtonSelected : null,
              ]}
            />
            <Text style={styles.radioLabel}>Enfermeria (requiere aprobacion administrativa)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Alert */}
      {profileType === UserProfileType.Nurse ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Como cuenta de enfermeria, necesitaras aprobacion administrativa antes de iniciar sesion.
          </Text>
        </View>
      ) : null}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonText}>Crear cuenta</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.secondaryButton, isLoading ? styles.buttonDisabled : null]}
        onPress={() => {
          void handleGoogleSignIn();
        }}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Continuar con Google</Text>
      </TouchableOpacity>

      <Text style={styles.secondaryHint}>Google crea una cuenta de cliente activa de inmediato.</Text>

      {/* Login Link */}
      <View style={styles.loginLinkContainer}>
        <Text style={styles.loginLinkText}>¿Ya tienes cuenta? </Text>
        <TouchableOpacity onPress={() => router.push("/login")} disabled={isLoading}>
          <Text style={styles.loginLink}>Inicia sesion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
    color: "#000",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#f9f9f9",
  },
  inputError: {
    borderColor: "#d32f2f",
    backgroundColor: "#ffebee",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 12,
    marginTop: 4,
  },
  radioGroup: {
    marginVertical: 10,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0066cc",
    marginRight: 12,
  },
  radioButtonSelected: {
    backgroundColor: "#0066cc",
  },
  radioLabel: {
    fontSize: 14,
    color: "#333",
  },
  infoBox: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#0066cc",
    lineHeight: 18,
  },
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 14,
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#777",
    fontSize: 13,
    fontWeight: "500",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#0066cc",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#f5f9ff",
  },
  secondaryButtonText: {
    color: "#0066cc",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryHint: {
    textAlign: "center",
    color: "#666",
    fontSize: 13,
    marginBottom: 20,
  },
});
