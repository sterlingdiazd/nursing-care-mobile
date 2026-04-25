import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/src/context/AuthContext";
import { validateEmail } from "@/src/api/auth";
import { resolvePostAuthRoute } from "@/src/utils/authRedirect";
import { hapticFeedback } from "@/src/utils/haptics";
import { authTestIds } from "@/src/testing/authTestIds";
import { FormButton, FormInput } from "@/src/components/form";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { testProps } from "@/src/testing/testIds";
import {
  getGoogleOAuthStartUrl,
} from "@/src/services/authService";
import { t } from "@/src/i18n/translations";

WebBrowser.maybeCompleteAuthSession();

function readOauthParams(url: string) {
  const parsed = Linking.parse(url);
  const initialQueryParams = parsed.queryParams ?? {};
  const hashIndex = url.indexOf("#");

  if (hashIndex < 0) {
    return initialQueryParams;
  }

  const fragment = url.slice(hashIndex + 1);
  const normalizedFragment = fragment.startsWith("?") ? fragment.slice(1) : fragment;
  const hashParams = new URLSearchParams(normalizedFragment);

  hashParams.forEach((value, key) => {
    initialQueryParams[key] = value;
  });

  return initialQueryParams;
}

export default function LoginScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { login, completeOAuthLogin, isLoading, error, clearError } = useAuth();
  const lastHandledUrlRef = useRef<string | null>(null);
  const lastHandledOauthPayloadRef = useRef<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Validation functions
  const validateEmailField = (value: string) => {
    if (!value) {
      setEmailError(t("auth.correo_obligatorio"));
    } else if (!validateEmail(value)) {
      setEmailError(t("auth.correo_formato_invalido"));
    } else {
      setEmailError("");
    }
  };

  const validatePasswordField = (value: string) => {
    if (!value) {
      setPasswordError(t("auth.contrasena_obligatoria"));
    } else {
      setPasswordError("");
    }
  };

  // Handle login submission
  const handleSubmit = async () => {
    clearError();
    validateEmailField(email);
    validatePasswordField(password);

    if (emailError || passwordError || !email || !password) {
      hapticFeedback.error();
      return;
    }

    try {
      hapticFeedback.selection();
      const response = await login(email.trim(), password);
      router.replace(resolvePostAuthRoute(response));
    } catch (e) {
      hapticFeedback.error();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      hapticFeedback.selection();
      const authUrl = getGoogleOAuthStartUrl();
      await WebBrowser.openAuthSessionAsync(authUrl, Linking.createURL("/login"));
    } catch (err) {
      hapticFeedback.error();
    }
  };

  // OAuth response handling
  useEffect(() => {
    const handleUrl = (url: string) => {
      if (lastHandledUrlRef.current === url) return;
      lastHandledUrlRef.current = url;

      const params = readOauthParams(url);
      if (params.token && params.roles) {
        const payload = JSON.stringify(params);
        if (lastHandledOauthPayloadRef.current === payload) return;
        lastHandledOauthPayloadRef.current = payload;

        completeOAuthLogin(params as any);
        const nextRoute = resolvePostAuthRoute(params as any);
        router.replace(nextRoute);
      }
    };

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, [completeOAuthLogin, router]);

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
          <View style={styles.header}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>{t("actions.iniciar_sesion")}</Text>
            <Text style={styles.subtitle}>
              {t("auth.bienvenido")}
            </Text>
          </View>

          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <FormInput
              testID={authTestIds.login.emailInput}
              accessibilityLabel="Correo electrónico"
              label="Correo Electrónico"
              placeholder="ejemplo@correo.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) validateEmailField(text);
              }}
              onBlur={() => validateEmailField(email)}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <FormInput
              testID={authTestIds.login.passwordInput}
              accessibilityLabel="Contraseña"
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) validatePasswordField(text);
              }}
              onBlur={() => validatePasswordField(password)}
              error={passwordError}
              secureTextEntry
              autoComplete="password"
            />

            <TouchableOpacity
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotPassword}
              accessibilityRole="link"
              accessibilityLabel="¿Olvidaste tu contraseña?"
              {...testProps(authTestIds.login.forgotPasswordLink)}
            >
              <Text style={styles.forgotPasswordText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            <FormButton
              testID={authTestIds.login.submitButton}
              accessibilityLabel="Entrar"
              onPress={handleSubmit}
              isLoading={isLoading}
              style={styles.submitButton}
            >
              {t("actions.entrar")}
            </FormButton>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <FormButton
              testID={authTestIds.login.googleButton}
              accessibilityLabel="Continuar con Google"
              onPress={handleGoogleLogin}
              variant="secondary"
              style={styles.googleButton}
            >
              {t("auth.continuar_google")}
            </FormButton>
          </View>

          {/* Footer removed — single login flow */}
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
    flexGrow: 1,
    padding: designTokens.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: designTokens.spacing.xxl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: designTokens.spacing.lg,
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
    width: "100%",
    maxWidth: 400,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: designTokens.spacing.xl,
  },
  forgotPasswordText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.accent,
    fontWeight: "600",
  },
  submitButton: {
    width: "100%",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: designTokens.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: designTokens.color.border.strong,
  },
  dividerText: {
    ...designTokens.typography.body,
    marginHorizontal: designTokens.spacing.md,
    color: designTokens.color.ink.muted,
  },
  googleButton: {
    width: "100%",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: designTokens.spacing.xxl,
  },
  footerText: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
  },
  registerLink: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.accent,
    fontWeight: "800",
    marginLeft: designTokens.spacing.xs,
  },
});
