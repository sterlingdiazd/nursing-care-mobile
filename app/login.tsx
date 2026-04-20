import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/src/context/AuthContext";
import { validateEmail } from "@/src/api/auth";
import { AuthResponse } from "@/src/types/auth";
import { resolvePostAuthRoute } from "@/src/utils/authRedirect";
import { hapticFeedback } from "@/src/utils/haptics";
import { authTestIds } from "@/src/testing/authTestIds";
import { FormButton, FormInput } from "@/src/components/form";
import { testProps } from "@/src/testing/testIds";
import {
  getGoogleOAuthStartUrl,
  getLocalHttpsCertificateWarning,
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
    // Validate all fields
    if (emailError || passwordError || !email || !password) {
      Alert.alert("Validacion", "Ingresa un correo valido y tu contrasena.");
      return;
    }

    try {
      const response = await login(email.trim(), password);
      router.replace(resolvePostAuthRoute(response));

      // Clear form
      setEmail("");
      setPassword("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "No fue posible iniciar sesion";
      Alert.alert("Error de inicio de sesion", errorMsg);
    }
  };

  useEffect(() => {
    const handleOAuthParams = async (
      rawParams: Record<string, string | string[] | undefined>,
      sourceKey: string,
    ) => {
      if (lastHandledOauthPayloadRef.current === sourceKey) {
        return;
      }

      const oauthStatus = getParamValue(rawParams.oauth);

      if (!oauthStatus) {
        return;
      }

      lastHandledOauthPayloadRef.current = sourceKey;

      if (oauthStatus === "error") {
        Alert.alert(
          "Error con Google",
          getParamValue(rawParams.message) || "No fue posible iniciar sesion con Google."
        );
        return;
      }

      const token = getParamValue(rawParams.token);
      const refreshToken = getParamValue(rawParams.refreshToken);
      const emailFromRedirect = getParamValue(rawParams.email);
      const roles = (getParamValue(rawParams.roles) || "")
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean);

      if (!token || !refreshToken || !emailFromRedirect || roles.length === 0) {
        Alert.alert("Error con Google", "La respuesta de inicio de sesion de Google estaba incompleta.");
        return;
      }

      const response: AuthResponse = {
        token,
        refreshToken,
        expiresAtUtc: getParamValue(rawParams.expiresAtUtc) ?? null,
        userId: getParamValue(rawParams.userId) ?? "",
        email: emailFromRedirect,
        roles,
        requiresProfileCompletion: getParamValue(rawParams.requiresProfileCompletion) === "true",
        requiresAdminReview: getParamValue(rawParams.requiresAdminReview) === "true",
      };

      await completeOAuthLogin(response);
      const destination = resolvePostAuthRoute(response);

      if (Platform.OS === "web") {
        router.replace(destination);
        return;
      }

      Alert.alert(
        response.requiresProfileCompletion ? "Completa tu registro" : "Inicio de sesion exitoso",
        response.requiresProfileCompletion
          ? "Tu cuenta de Google quedo creada, pero debes completar el registro antes de usar la app."
          : "Redirigiendo al panel...",
        [
          {
            text: "Aceptar",
            onPress: () => router.replace(destination),
          },
        ],
      );
    };

    const handleOAuthUrl = async (url: string | null) => {
      if (!url || lastHandledUrlRef.current === url) {
        return;
      }

      lastHandledUrlRef.current = url;
      const queryParams = readOauthParams(url);
      const sourceKey = url;
      await handleOAuthParams(queryParams, sourceKey);
    };

    const hasQueryOauth = Boolean(getParamValue(searchParams.oauth));
    if (hasQueryOauth) {
      const normalizedParams = Object.fromEntries(
        Object.entries(searchParams).map(([key, value]) => [key, value]),
      );
      const sourceKey = JSON.stringify(normalizedParams);
      void handleOAuthParams(normalizedParams, sourceKey);
    } else {
      Linking.getInitialURL()
        .then((url) => handleOAuthUrl(url))
        .catch((error) => {
          console.error("Failed to process initial OAuth URL:", error);
        });
    }

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleOAuthUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [completeOAuthLogin, router, searchParams]);

  const handleGoogleSignIn = async () => {
    const certificateWarning = getLocalHttpsCertificateWarning();

    if (certificateWarning) {
      Alert.alert("Certificado local requerido", certificateWarning);
    }

    try {
      const redirectUrl = Linking.createURL("/login");
      const startUrl = getGoogleOAuthStartUrl("mobile", redirectUrl);

      if (Platform.OS === "web") {
        await Linking.openURL(startUrl);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUrl);

      if (result.type === "success" && result.url) {
        await Linking.openURL(result.url);
        return;
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        return;
      }

      Alert.alert("Error con Google", "No fue posible completar el inicio de sesion en el navegador integrado.");
    } catch (error) {
      Alert.alert(
        "Error con Google",
        error instanceof Error ? error.message : "No fue posible abrir el acceso con Google."
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} {...testProps(authTestIds.login.screen)}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
      <View style={styles.logoHost}>
        <Image 
          source={require("@/assets/images/logo.png")} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>Sol y Luna</Text>
      <Text style={styles.subtitle}>Cuidado profesional, calidad humana.</Text>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      ) : null}

      {/* Email Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Correo</Text>
        <FormInput
          testID={authTestIds.login.emailInput}
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="tu@correo.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) clearError();
          }}
          onBlur={() => validateEmailField(email)}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {emailError ? <Text style={styles.errorText} {...testProps(authTestIds.login.emailError)}>{emailError}</Text> : null}
      </View>

      {/* Password Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Contrasena</Text>
        <FormInput
          testID={authTestIds.login.passwordInput}
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="Ingresa tu contrasena"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) clearError();
          }}
          onBlur={() => validatePasswordField(password)}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {passwordError ? <Text style={styles.errorText} {...testProps(authTestIds.login.passwordError)}>{passwordError}</Text> : null}
      </View>

      <FormButton
        testID={authTestIds.login.forgotPasswordLink}
        onPress={() => {
          hapticFeedback.light();
          router.push("/forgot-password" as any);
        }}
        style={styles.forgotPasswordContainer}
        disabled={isLoading}
      >
        <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
      </FormButton>

      {/* Login Button */}
      <FormButton
        testID={authTestIds.login.submitButton}
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        onPress={() => {
          hapticFeedback.light();
          void handleSubmit();
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonText}>Iniciar sesion</Text>
        )}
      </FormButton>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.dividerLine} />
      </View>

      <FormButton
        testID={authTestIds.login.googleButton}
        style={[styles.secondaryButton, isLoading ? styles.buttonDisabled : null]}
        onPress={() => {
          hapticFeedback.light();
          void handleGoogleSignIn();
        }}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Continuar con Google</Text>
      </FormButton>

      {/* Register Link */}
      <View style={styles.registerLinkContainer}>
        <Text style={styles.registerLinkText}>¿No tienes cuenta? </Text>
        <FormButton
          testID={authTestIds.login.registerLink}
          onPress={() => {
            hapticFeedback.light();
            router.push("/register" as any);
          }}
          disabled={isLoading}
        >
          <Text style={styles.registerLink}>Registrate</Text>
        </FormButton>
      </View>
    </ScrollView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    flexGrow: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 40,
    fontWeight: "500",
  },
  logoHost: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    color: "#4a4a4a",
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e4e8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: "#ff3b30",
    backgroundColor: "#fff5f5",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#007aff",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#007aff",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007aff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#b2d7ff",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e1e4e8",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#8e8e93",
    fontSize: 14,
    fontWeight: "500",
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#007aff",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginBottom: 32,
  },
  secondaryButtonText: {
    color: "#007aff",
    fontSize: 16,
    fontWeight: "700",
  },
  registerLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerLinkText: {
    fontSize: 15,
    color: "#666",
  },
  registerLink: {
    fontSize: 15,
    color: "#007aff",
    fontWeight: "700",
  },
  errorContainer: {
    backgroundColor: "#fee",
    borderColor: "#fcc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorMessage: {
    color: "#c33",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
