import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { forgotPassword, validateEmail } from "@/src/api/auth";
import { hapticFeedback } from "@/src/utils/haptics";
import {
  FORGOT_PASSWORD_SUCCESS_BODY,
  FORGOT_PASSWORD_SUCCESS_INFO,
  FORGOT_PASSWORD_SUCCESS_TITLE,
  PASSWORD_RECOVERY_RESEND_COOLDOWN_SECONDS,
  getForgotPasswordResendInfo,
  getForgotPasswordResendLabel,
} from "@/src/utils/passwordRecovery";
import { authTestIds } from "@/src/testing/authTestIds";
import { FormButton, FormInput } from "@/src/components/form";
import { testProps } from "@/src/testing/testIds";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCooldownRemaining((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const validateEmailField = (value: string) => {
    if (!value) {
      setEmailError("El correo es obligatorio");
    } else if (!validateEmail(value)) {
      setEmailError("El formato del correo no es valido");
    } else {
      setEmailError("");
    }
  };

  const requestRecoveryCode = async () => {
    setRequestError("");
    validateEmailField(email);
    if (!email || !validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      setIsSuccess(true);
      setCooldownRemaining(PASSWORD_RECOVERY_RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "No fue posible procesar la solicitud";
      setRequestError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} {...testProps(authTestIds.forgotPassword.screen)}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
      <FormButton
        testID="forgot-password-back-button"
        style={styles.backButton}
        onPress={() => {
          hapticFeedback.light();
          router.back();
        }}
      >
        <Text style={styles.backButtonText}>← Volver</Text>
      </FormButton>

      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresa tu correo electrónico y te enviaremos un código para restablecer tu acceso.
      </Text>

      {requestError ? <Text style={styles.errorBanner} {...testProps(authTestIds.forgotPassword.errorBanner)}>{requestError}</Text> : null}

      {isSuccess ? (
        <View style={styles.successCard} {...testProps(authTestIds.forgotPassword.successCard)}>
          <Text style={styles.successTitle}>{FORGOT_PASSWORD_SUCCESS_TITLE}</Text>
          <Text style={styles.successBody}>{FORGOT_PASSWORD_SUCCESS_BODY}</Text>
          <Text style={styles.infoText}>{FORGOT_PASSWORD_SUCCESS_INFO}</Text>

          <FormButton
            testID={authTestIds.forgotPassword.enterCodeButton}
            style={[styles.button, isLoading ? styles.buttonDisabled : null]}
            onPress={() => router.push({
              pathname: "/reset-password",
              params: { email: email.trim() }
            })}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Ingresar código</Text>
          </FormButton>

          <FormButton
            testID={authTestIds.forgotPassword.resendButton}
            style={[styles.secondaryButton, (isLoading || cooldownRemaining > 0) ? styles.buttonDisabled : null]}
            onPress={() => {
              hapticFeedback.light();
              void requestRecoveryCode();
            }}
            disabled={isLoading || cooldownRemaining > 0}
          >
            {isLoading ? (
              <ActivityIndicator color="#0066cc" size="small" />
            ) : (
              <Text style={styles.secondaryButtonText}>{getForgotPasswordResendLabel(cooldownRemaining)}</Text>
            )}
          </FormButton>

          <Text style={styles.infoText}>{getForgotPasswordResendInfo(cooldownRemaining)}</Text>
        </View>
      ) : (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <FormInput
              testID={authTestIds.forgotPassword.emailInput}
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
            {emailError ? <Text style={styles.errorText} {...testProps(authTestIds.forgotPassword.emailError)}>{emailError}</Text> : null}
          </View>

          <FormButton
            testID={authTestIds.forgotPassword.submitButton}
            style={[styles.button, isLoading ? styles.buttonDisabled : null]}
            onPress={() => {
              hapticFeedback.light();
              void requestRecoveryCode();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>Enviar código</Text>
            )}
          </FormButton>

          <FormButton
            testID="forgot-password-enter-code-link"
            onPress={() => {
              hapticFeedback.light();
              router.push({
                pathname: "/reset-password",
                params: { email: email.trim() }
              });
            }}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>¿Ya tienes un código? </Text>
            <Text style={styles.link}>Ingrésalo aquí</Text>
          </FormButton>
        </>
      )}
    </ScrollView>
  </SafeAreaView>
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
  errorBanner: {
    color: "#b00020",
    backgroundColor: "#fdecea",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
    lineHeight: 20,
  },
  successCard: {
    backgroundColor: "#f4f8fc",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#c9dff5",
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f3a5d",
    marginBottom: 10,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 22,
    color: "#29465b",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#4c6478",
    marginTop: 6,
    marginBottom: 6,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#0066cc",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 6,
  },
  secondaryButtonText: {
    color: "#0066cc",
    fontSize: 15,
    fontWeight: "600",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  linkText: {
    fontSize: 14,
    color: "#666",
  },
  link: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
});
