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
import { getGoogleOAuthStartUrl } from "@/src/services/authService";

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
      setEmailError("Email is required");
    } else if (!validateEmail(value)) {
      setEmailError("Invalid email format");
    } else {
      setEmailError("");
    }
  };

  const validatePasswordField = (value: string) => {
    if (!value) {
      setPasswordError("Password is required");
    } else {
      setPasswordError("");
    }
  };

  // Handle login submission
  const handleSubmit = async () => {
    // Validate all fields
    if (emailError || passwordError || !email || !password) {
      Alert.alert("Validation Error", "Please enter valid email and password");
      return;
    }

    try {
      await login(email.trim(), password);

      Alert.alert("Login Successful", "Redirecting to dashboard...", [
        {
          text: "OK",
          onPress: () => router.push("/(tabs)"),
        },
      ]);

      // Clear form
      setEmail("");
      setPassword("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Login failed";
      Alert.alert("Login Error", errorMsg);
    }
  };

  useEffect(() => {
    const handleOAuthUrl = async (url: string | null) => {
      if (!url || lastHandledUrlRef.current === url) {
        return;
      }

      const parsed = Linking.parse(url);
      const oauthStatus = getParamValue(parsed.queryParams?.oauth);

      if (!oauthStatus) {
        return;
      }

      lastHandledUrlRef.current = url;

      if (oauthStatus === "error") {
        Alert.alert(
          "Google Sign-In Error",
          getParamValue(parsed.queryParams?.message) || "Unable to sign in with Google."
        );
        return;
      }

      const token = getParamValue(parsed.queryParams?.token);
      const refreshToken = getParamValue(parsed.queryParams?.refreshToken);
      const emailFromRedirect = getParamValue(parsed.queryParams?.email);
      const roles = (getParamValue(parsed.queryParams?.roles) || "")
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean);

      if (!token || !refreshToken || !emailFromRedirect || roles.length === 0) {
        Alert.alert("Google Sign-In Error", "The Google login response was incomplete.");
        return;
      }

      const response: AuthResponse = {
        token,
        refreshToken,
        expiresAtUtc: getParamValue(parsed.queryParams?.expiresAtUtc) ?? null,
        email: emailFromRedirect,
        roles,
      };

      await completeOAuthLogin(response);
      Alert.alert("Login Successful", "Redirecting to dashboard...", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
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
    try {
      await Linking.openURL(getGoogleOAuthStartUrl("mobile"));
    } catch (error) {
      Alert.alert(
        "Google Sign-In Error",
        error instanceof Error ? error.message : "Unable to open Google sign-in."
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Title */}
      <Text style={styles.title}>Log In</Text>

      {/* Email Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="you@example.com"
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
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          onBlur={() => validatePasswordField(password)}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      </View>

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.secondaryButton, isLoading ? styles.buttonDisabled : null]}
        onPress={() => {
          void handleGoogleSignIn();
        }}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Register Link */}
      <View style={styles.registerLinkContainer}>
        <Text style={styles.registerLinkText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/register")} disabled={isLoading}>
          <Text style={styles.registerLink}>Register</Text>
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
