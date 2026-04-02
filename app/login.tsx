import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useAuth } from "@/src/context/AuthContext";
import { validateEmail } from "@/src/api/auth";
import { AuthResponse } from "@/src/types/auth";
import { hapticFeedback } from "@/src/utils/haptics";
import {
  getGoogleOAuthStartUrl,
  getLocalHttpsCertificateWarning,
} from "@/src/services/authService";

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
  const { login, completeOAuthLogin, isLoading } = useAuth();
  const lastHandledUrlRef = useRef<string | null>(null);

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
    // Validate all fields
    if (emailError || passwordError || !email || !password) {
      Alert.alert("Validacion", "Ingresa un correo valido y tu contrasena.");
      return;
    }

    try {
      await login(email.trim(), password);

      // Navigate immediately while the success haptic reinforces the outcome
      router.replace("/care-requests");

      // Clear form
      setEmail("");
      setPassword("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "No fue posible iniciar sesion";
      Alert.alert("Error de inicio de sesion", errorMsg);
    }
  };

  useEffect(() => {
    const handleOAuthUrl = async (url: string | null) => {
      if (!url || lastHandledUrlRef.current === url) {
        return;
      }

      const queryParams = readOauthParams(url);
      const oauthStatus = getParamValue(queryParams.oauth);

      if (!oauthStatus) {
        return;
      }

      lastHandledUrlRef.current = url;

      if (oauthStatus === "error") {
        Alert.alert(
          "Error con Google",
          getParamValue(queryParams.message) || "No fue posible iniciar sesion con Google."
        );
        return;
      }

      const token = getParamValue(queryParams.token);
      const refreshToken = getParamValue(queryParams.refreshToken);
      const emailFromRedirect = getParamValue(queryParams.email);
      const roles = (getParamValue(queryParams.roles) || "")
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
        expiresAtUtc: getParamValue(queryParams.expiresAtUtc) ?? null,
        userId: getParamValue(queryParams.userId) ?? "",
        email: emailFromRedirect,
        roles,
        requiresProfileCompletion: getParamValue(queryParams.requiresProfileCompletion) === "true",
        requiresAdminReview: getParamValue(queryParams.requiresAdminReview) === "true",
      };

      await completeOAuthLogin(response);
      Alert.alert(
        response.requiresProfileCompletion ? "Completa tu registro" : "Inicio de sesion exitoso",
        response.requiresProfileCompletion
          ? "Tu cuenta de Google quedo creada, pero debes completar el registro antes de usar la app."
          : "Redirigiendo al panel...",
        [
        {
          text: "Aceptar",
          onPress: () => router.replace(response.requiresProfileCompletion ? "/register" : "/care-requests"),
        },
      ]);
    };

    Linking.getInitialURL()
      .then((url) => handleOAuthUrl(url))
      .catch((error) => {
        console.error("Failed to process initial OAuth URL:", error);
      });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleOAuthUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [completeOAuthLogin, router]);

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
    <SafeAreaView style={styles.container}>
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
          placeholder="Ingresa tu contrasena"
          value={password}
          onChangeText={setPassword}
          onBlur={() => validatePasswordField(password)}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      </View>

      <TouchableOpacity
        onPress={() => {
          hapticFeedback.light();
          router.push("/forgot-password" as any);
        }}
        style={styles.forgotPasswordContainer}
        disabled={isLoading}
      >
        <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
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
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.secondaryButton, isLoading ? styles.buttonDisabled : null]}
        onPress={() => {
          hapticFeedback.light();
          void handleGoogleSignIn();
        }}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Continuar con Google</Text>
      </TouchableOpacity>

      {/* Register Link */}
      <View style={styles.registerLinkContainer}>
        <Text style={styles.registerLinkText}>¿No tienes cuenta? </Text>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            router.push("/register" as any);
          }}
          disabled={isLoading}
        >
          <Text style={styles.registerLink}>Registrate</Text>
        </TouchableOpacity>
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
});

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
