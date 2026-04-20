import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { resetPassword, validateEmail, validatePassword } from "@/src/api/auth";
import {
  RESET_PASSWORD_HELP_TEXT,
  buildPasswordResetSuccessAlert,
} from "@/src/utils/passwordRecovery";
import { authTestIds } from "@/src/testing/authTestIds";
import { FormButton, FormInput } from "@/src/components/form";
import { testProps } from "@/src/testing/testIds";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email: initialEmail } = useLocalSearchParams<{ email: string }>();
  const [email, setEmail] = useState(initialEmail || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Errors
  const [emailError, setEmailError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validate = () => {
    let isValid = true;
    
    if (!email || !validateEmail(email)) {
      setEmailError("El formato del correo no es valido");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!code || code.length < 6) {
      setCodeError("El código debe tener 6 dígitos");
      isValid = false;
    } else {
      setCodeError("");
    }

    const passVal = validatePassword(newPassword);
    if (!passVal.isValid) {
      setPasswordError(passVal.message);
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await resetPassword(email.trim(), code.trim(), newPassword);
      const successAlert = buildPasswordResetSuccessAlert(response.message);

      Alert.alert(successAlert.title, successAlert.message, [
        {
          text: successAlert.actionLabel,
          onPress: () => {
            router.replace(successAlert.redirectPath);
          },
        },
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "No fue posible restablecer la contraseña";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      {...testProps(authTestIds.resetPassword.screen)}
    >
      <FormButton
        testID="reset-password-back-button"
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Volver</Text>
      </FormButton>

      <Text style={styles.title}>Restablecer contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresa el código que recibiste y tu nueva contraseña.
      </Text>
      <Text style={styles.helperText}>
        {RESET_PASSWORD_HELP_TEXT}
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Correo electrónico</Text>
        <FormInput
          testID={authTestIds.resetPassword.emailInput}
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading && !initialEmail}
          placeholderTextColor="#999"
        />
        {emailError ? <Text style={styles.errorText} {...testProps(authTestIds.resetPassword.emailError)}>{emailError}</Text> : null}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Código de verificación</Text>
        <FormInput
          testID={authTestIds.resetPassword.codeInput}
          style={[styles.input, codeError ? styles.inputError : null]}
          placeholder="123456"
          value={code}
          onChangeText={(val) => setCode(val.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {codeError ? <Text style={styles.errorText} {...testProps(authTestIds.resetPassword.codeError)}>{codeError}</Text> : null}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nueva contraseña</Text>
        <FormInput
          testID={authTestIds.resetPassword.newPasswordInput}
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="Mínimo 6 caracteres"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Confirmar nueva contraseña</Text>
        <FormInput
          testID={authTestIds.resetPassword.confirmPasswordInput}
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="Repite la contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {passwordError ? <Text style={styles.errorText} {...testProps(authTestIds.resetPassword.passwordError)}>{passwordError}</Text> : null}
      </View>

      <FormButton
        testID={authTestIds.resetPassword.submitButton}
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonText}>Establecer contraseña</Text>
        )}
      </FormButton>
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
    paddingVertical: 60,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: "#0066cc",
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 30,
    lineHeight: 22,
  },
  formGroup: {
    marginBottom: 20,
  },
  helperText: {
    fontSize: 13,
    color: "#63788a",
    marginBottom: 24,
    lineHeight: 20,
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
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
