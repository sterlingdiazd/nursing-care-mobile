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
            <Text style={styles.title}>Iniciar Sesión</Text>
            <Text style={styles.subtitle}>
              Bienvenido de nuevo a Nursing Care
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
              {...testProps(authTestIds.login.forgotPasswordLink)}
            >
              <Text style={styles.forgotPasswordText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            <FormButton
              testID={authTestIds.login.submitButton}
              onPress={handleSubmit}
              isLoading={isLoading}
              style={styles.submitButton}
            >
              Entrar
            </FormButton>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <FormButton
              testID={authTestIds.login.googleButton}
              onPress={handleGoogleLogin}
              variant="secondary"
              style={styles.googleButton}
            >
              Continuar con Google
            </FormButton>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes una cuenta?</Text>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              {...testProps(authTestIds.login.registerLink)}
            >
              <Text style={styles.registerLink}>Regístrate</Text>
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
