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
import { Banner } from "@/src/components/shared/Banner";
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

  // Pure validators — return the error string (or empty for "valid"). Do NOT
  // touch state. Callers decide when to commit. Trim on the way in: iOS
  // autofill sometimes injects a trailing space or newline, which would fail
  // the email regex and surface as a false "correo inválido".
  const computeEmailError = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return t("auth.correo_obligatorio");
    if (!validateEmail(trimmed)) return t("auth.correo_formato_invalido");
    return "";
  };

  const computePasswordError = (value: string) => {
    if (!value) return t("auth.contrasena_obligatoria");
    return "";
  };

  // No onBlur validation. Login validates on submit only. Reason:
  // iOS Safari keychain autofill races against React. When the user picks a
  // saved credential, iOS writes the value into the email DOM input and
  // moves focus to password — that focus shift fires email's onBlur. If
  // onBlur ran any validator, it would read empty state (autofill skipped
  // onChangeText) and falsely raise "El correo es obligatorio" on a field
  // that visibly holds a perfectly good email. Reading the DOM as a fallback
  // doesn't help reliably because the DOM-write and the focus-blur
  // interleave non-deterministically — sometimes blur fires before the value
  // commits. The robust answer is to not run validation on blur at all.
  // Submit-time validation covers everything (handleSubmit reads the DOM).

  // iOS keychain autofill in Mobile Safari (the Expo web target the device
  // loads) populates the underlying <input> value but does NOT always fire
  // React Native Web's onChangeText. That left local state empty and the
  // validator falsely reported "El correo es obligatorio" even though the
  // input visibly held an email. At submit time on web, fall back to reading
  // the DOM directly when state is empty.
  const readAutofilledValue = (testId: string): string => {
    if (Platform.OS !== "web" || typeof document === "undefined") return "";
    const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | null;
    return el?.value ?? "";
  };

  const handleSubmit = async () => {
    // CRITICAL ORDER: read the DOM input values BEFORE any setState. Any
    // setState (including clearError) triggers a re-render that lets React
    // overwrite the DOM input's value with the controlled `value` prop —
    // which is empty when state didn't catch the autofill. Reading first
    // captures whatever iOS/Safari injected before React clobbers it.
    const domEmail = readAutofilledValue(authTestIds.login.emailInput).trim();
    const domPassword = readAutofilledValue(authTestIds.login.passwordInput);

    const resolvedEmail = email.trim() || domEmail;
    const resolvedPassword = password || domPassword;

    clearError();
    if (resolvedEmail && !email.trim()) setEmail(resolvedEmail);
    if (resolvedPassword && !password) setPassword(resolvedPassword);

    // Compute validation results as locals — never the closure-captured
    // emailError/passwordError state, which is one render behind a setState
    // and was the cause of the previous "needs 3 clicks" bug.
    const nextEmailError = computeEmailError(resolvedEmail);
    const nextPasswordError = computePasswordError(resolvedPassword);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      hapticFeedback.error();
      return;
    }

    try {
      hapticFeedback.selection();
      const response = await login(resolvedEmail, resolvedPassword);
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
              source={require("../assets/images/logo-vertical.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>{t("actions.iniciar_sesion")}</Text>
            <Text style={styles.subtitle}>
              {t("auth.bienvenido")}
            </Text>
          </View>

          <View style={styles.card}>
            {error ? <View style={styles.bannerSlot}><Banner tone="error" message={error} /></View> : null}

            <FormInput
              testID={authTestIds.login.emailInput}
              accessibilityLabel="Correo electrónico"
              label="Correo Electrónico"
              placeholder="ejemplo@correo.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError("");
              }}
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
                if (passwordError) setPasswordError("");
              }}
              error={passwordError}
              secureTextEntry
              autoComplete="password"
            />

            <TouchableOpacity
              onPress={() => {
                hapticFeedback.selection();
                router.push("/forgot-password");
              }}
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta?</Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.selection();
                router.push("/register");
              }}
              accessibilityRole="link"
              accessibilityLabel="Registrar cuenta"
            >
              <Text style={styles.registerLink}>Registrar</Text>
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
    // Vertical lockup (mark + "SOL Y LUNA / CASA HOGAR") — natural aspect ~1.37:1.
    width: 208,
    height: 152,
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
  bannerSlot: {
    marginBottom: designTokens.spacing.lg,
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
