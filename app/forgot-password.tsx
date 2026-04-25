import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
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
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { testProps } from "@/src/testing/testIds";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldownRemaining((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const validateEmailField = (value: string) => {
    if (!value) {
      setEmailError("El correo es obligatorio");
    } else if (!validateEmail(value)) {
      setEmailError("El formato del correo no es válido");
    } else {
      setEmailError("");
    }
  };

  const requestRecoveryCode = async () => {
    hapticFeedback.selection();
    setRequestError("");
    validateEmailField(email);
    if (!email || !validateEmail(email)) {
      hapticFeedback.error();
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      setIsSuccess(true);
      setCooldownRemaining(PASSWORD_RECOVERY_RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      hapticFeedback.error();
      setRequestError(error instanceof Error ? error.message : "No fue posible procesar la solicitud");
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
              goBackOrReplace(router, mobileNavigationEscapes.forgotPassword);
            }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Recuperar Contraseña</Text>
            <Text style={styles.subtitle}>
              Te enviaremos un código para restablecer tu acceso.
            </Text>
          </View>

          <View style={styles.card}>
            {requestError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{requestError}</Text>
              </View>
            ) : null}

            {isSuccess ? (
              <View {...testProps(authTestIds.forgotPassword.successCard)}>
                <View style={styles.successHeader}>
                  <Text style={styles.successTitle}>{FORGOT_PASSWORD_SUCCESS_TITLE}</Text>
                </View>
                <Text style={styles.successBody}>{FORGOT_PASSWORD_SUCCESS_BODY}</Text>
                <Text style={styles.infoText}>{FORGOT_PASSWORD_SUCCESS_INFO}</Text>

                <FormButton
                  testID={authTestIds.forgotPassword.enterCodeButton}
                  onPress={() => router.push({
                    pathname: "/reset-password",
                    params: { email: email.trim() }
                  })}
                  style={styles.mainButton}
                >
                  Ingresar código
                </FormButton>

                <FormButton
                  testID={authTestIds.forgotPassword.resendButton}
                  variant="secondary"
                  onPress={requestRecoveryCode}
                  disabled={cooldownRemaining > 0}
                  isLoading={isLoading}
                >
                  {getForgotPasswordResendLabel(cooldownRemaining)}
                </FormButton>

                <Text style={styles.resendInfo}>
                  {getForgotPasswordResendInfo(cooldownRemaining)}
                </Text>
              </View>
            ) : (
              <>
                <FormInput
                  testID={authTestIds.forgotPassword.emailInput}
                  accessibilityLabel="Correo electrónico"
                  label="Correo Electrónico"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => validateEmailField(email)}
                  error={emailError}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />

                <FormButton
                  testID={authTestIds.forgotPassword.submitButton}
                  onPress={requestRecoveryCode}
                  isLoading={isLoading}
                  style={styles.mainButton}
                >
                  Enviar Código
                </FormButton>

                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.selection();
                    router.push({
                      pathname: "/reset-password",
                      params: { email: email.trim() }
                    });
                  }}
                  style={styles.hasCodeLink}
                  accessibilityRole="link"
                  accessibilityLabel="Ya tengo un código, ir a restablecer contraseña"
                >
                  <Text style={styles.hasCodeText}>
                    ¿Ya tienes un código? <Text style={styles.accentText}>Ingrésalo aquí</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              {...testProps(authTestIds.forgotPassword.backToLoginLink)}
              onPress={() => {
                hapticFeedback.selection();
                router.replace(mobileNavigationEscapes.forgotPassword);
              }}
              style={styles.loginLink}
              accessibilityRole="link"
              accessibilityLabel="Volver a iniciar sesión"
            >
              <Text style={styles.loginLinkText}>Volver a iniciar sesión</Text>
            </TouchableOpacity>
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
  successHeader: {
    backgroundColor: designTokens.color.status.successBg,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.lg,
  },
  successTitle: {
    ...designTokens.typography.label,
    color: designTokens.color.status.successText,
    textAlign: "center",
  },
  successBody: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.md,
    lineHeight: 22,
  },
  infoText: {
    ...designTokens.typography.body,
    fontSize: 13,
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.xl,
  },
  mainButton: {
    marginBottom: designTokens.spacing.md,
  },
  resendInfo: {
    ...designTokens.typography.body,
    fontSize: 12,
    color: designTokens.color.ink.muted,
    textAlign: "center",
    marginTop: designTokens.spacing.sm,
  },
  hasCodeLink: {
    marginTop: designTokens.spacing.lg,
    alignItems: "center",
  },
  loginLink: {
    marginTop: designTokens.spacing.xl,
    alignItems: "center",
  },
  loginLinkText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.accent,
    fontWeight: "600",
  },
  hasCodeText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
  },
  accentText: {
    color: designTokens.color.ink.accent,
    fontWeight: "700",
  },
});
