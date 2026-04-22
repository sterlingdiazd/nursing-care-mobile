import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { resetPassword, validateEmail, validatePassword } from "@/src/api/auth";
import {
  RESET_PASSWORD_HELP_TEXT,
  buildPasswordResetSuccessAlert,
} from "@/src/utils/passwordRecovery";
import { hapticFeedback } from "@/src/utils/haptics";
import { authTestIds } from "@/src/testing/authTestIds";
import { FormButton, FormInput } from "@/src/components/form";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
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
  const [generalError, setGeneralError] = useState("");

  const validate = () => {
    let isValid = true;
    
    if (!email || !validateEmail(email)) {
      setEmailError("El formato del correo no es válido");
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
    setGeneralError("");
    if (!validate()) {
      hapticFeedback.error();
      return;
    }

    setIsLoading(true);
    try {
      hapticFeedback.selection();
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
      hapticFeedback.error();
      setGeneralError(error instanceof Error ? error.message : "No fue posible restablecer la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.selection();
              router.back();
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Nueva Contraseña</Text>
            <Text style={styles.subtitle}>
              Ingresa el código que recibiste y tu nueva contraseña.
            </Text>
          </View>

          <View style={styles.card}>
            {generalError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{generalError}</Text>
              </View>
            ) : null}

            <Text style={styles.helperText}>
              {RESET_PASSWORD_HELP_TEXT}
            </Text>

            <FormInput
              testID={authTestIds.resetPassword.emailInput}
              label="Correo Electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading && !initialEmail}
            />

            <FormInput
              testID={authTestIds.resetPassword.codeInput}
              label="Código de Verificación"
              placeholder="123456"
              value={code}
              onChangeText={(val) => setCode(val.replace(/\D/g, "").slice(0, 6))}
              error={codeError}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
            />

            <FormInput
              testID={authTestIds.resetPassword.newPasswordInput}
              label="Nueva Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!isLoading}
            />

            <FormInput
              testID={authTestIds.resetPassword.confirmPasswordInput}
              label="Confirmar Nueva Contraseña"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={passwordError}
              secureTextEntry
              editable={!isLoading}
            />

            <FormButton
              testID={authTestIds.resetPassword.submitButton}
              onPress={handleSubmit}
              isLoading={isLoading}
              style={styles.submitButton}
            >
              Establecer Contraseña
            </FormButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.color.surface.canvas,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: designTokens.spacing.xl,
  },
  backButton: {
    marginBottom: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.sm,
  },
  backButtonText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.accent,
    fontWeight: "600",
  },
  header: {
    marginBottom: designTokens.spacing.xxl,
  },
  title: {
    ...designTokens.typography.title,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.xs,
  },
  subtitle: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
  },
  card: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.xl,
  },
  helperText: {
    ...designTokens.typography.body,
    fontSize: 13,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.xl,
    lineHeight: 20,
    backgroundColor: designTokens.color.surface.secondary,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    overflow: "hidden",
  },
  errorBanner: {
    backgroundColor: designTokens.color.status.dangerBg,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
  },
  errorBannerText: {
    ...designTokens.typography.body,
    color: designTokens.color.status.dangerText,
    fontWeight: "600",
    textAlign: "center",
  },
  submitButton: {
    marginTop: designTokens.spacing.md,
  },
});
