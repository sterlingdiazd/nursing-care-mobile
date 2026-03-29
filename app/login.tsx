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
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useAuth } from "@/src/context/AuthContext";
import { validateEmail } from "@/src/api/auth";
import { AuthResponse } from "@/src/types/auth";
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

      Alert.alert("Inicio de sesion exitoso", "Redirigiendo al panel...", [
        {
          text: "Aceptar",
          onPress: () => router.push("/care-requests"),
        },
      ]);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Title */}
      <Text style={styles.title}>Iniciar sesion</Text>

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
        onPress={() => router.push("/forgot-password" as any)}
        style={styles.forgotPasswordContainer}
        disabled={isLoading}
      >
        <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
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
          void handleGoogleSignIn();
        }}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Continuar con Google</Text>
      </TouchableOpacity>

      {/* Register Link */}
      <View style={styles.registerLinkContainer}>
        <Text style={styles.registerLinkText}>¿No tienes cuenta? </Text>
        <TouchableOpacity onPress={() => router.push("/register" as any)} disabled={isLoading}>
          <Text style={styles.registerLink}>Registrate</Text>
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
    paddingVertical: 60,
    justifyContent: "center",
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
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: -10,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
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
  registerLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerLinkText: {
    fontSize: 14,
    color: "#666",
  },
  registerLink: {
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
    marginBottom: 20,
    backgroundColor: "#f5f9ff",
  },
  secondaryButtonText: {
    color: "#0066cc",
    fontSize: 16,
    fontWeight: "600",
  },
});

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
