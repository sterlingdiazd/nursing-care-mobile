import React, { useState } from "react";
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
import { useAuth, UserProfileType } from "@/src/context/AuthContext";
import { validateEmail, validatePassword } from "@/src/api/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileType, setProfileType] = useState<UserProfileType>(UserProfileType.Client);

  // Validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

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
      const validation = validatePassword(value);
      setPasswordError(validation.isValid ? "" : validation.message);
    }
  };

  const validateConfirmPasswordField = (value: string) => {
    if (!value) {
      setConfirmPasswordError("Please confirm your password");
    } else if (value !== password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  // Handle registration submission
  const handleSubmit = async () => {
    // Validate all fields
    if (emailError || passwordError || confirmPasswordError || !email || !password || !confirmPassword) {
      Alert.alert("Validation Error", "Please fix all errors before submitting");
      return;
    }

    try {
      await register(email.trim(), password, confirmPassword, profileType);

      // Show success message based on profile type
      if (profileType === UserProfileType.Nurse) {
        Alert.alert(
          "Registration Successful",
          "Your account is pending admin approval. You will receive an email when activated.",
          [
            {
              text: "OK",
              onPress: () => router.push("/login"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Registration Successful",
          "You can now log in with your credentials.",
          [
            {
              text: "Go to Login",
              onPress: () => router.push("/login"),
            },
          ]
        );
      }

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Registration failed";
      Alert.alert("Registration Error", errorMsg);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Title */}
      <Text style={styles.title}>Create Account</Text>

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
          placeholder="Minimum 6 characters"
          value={password}
          onChangeText={setPassword}
          onBlur={() => validatePasswordField(password)}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      </View>

      {/* Confirm Password Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={[styles.input, confirmPasswordError ? styles.inputError : null]}
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => validateConfirmPasswordField(confirmPassword)}
          secureTextEntry
          editable={!isLoading}
          placeholderTextColor="#999"
        />
        {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
      </View>

      {/* Profile Type Selection */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Register as:</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setProfileType(UserProfileType.Client)}
            disabled={isLoading}
          >
            <View
              style={[
                styles.radioButton,
                profileType === UserProfileType.Client ? styles.radioButtonSelected : null,
              ]}
            />
            <Text style={styles.radioLabel}>Client</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setProfileType(UserProfileType.Nurse)}
            disabled={isLoading}
          >
            <View
              style={[
                styles.radioButton,
                profileType === UserProfileType.Nurse ? styles.radioButtonSelected : null,
              ]}
            />
            <Text style={styles.radioLabel}>Nurse (requires admin approval)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Alert */}
      {profileType === UserProfileType.Nurse ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ As a nurse, your account will require admin approval before you can log in.
          </Text>
        </View>
      ) : null}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      {/* Login Link */}
      <View style={styles.loginLinkContainer}>
        <Text style={styles.loginLinkText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/login")} disabled={isLoading}>
          <Text style={styles.loginLink}>Log in</Text>
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
    paddingVertical: 40,
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
  radioGroup: {
    marginVertical: 10,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0066cc",
    marginRight: 12,
  },
  radioButtonSelected: {
    backgroundColor: "#0066cc",
  },
  radioLabel: {
    fontSize: 14,
    color: "#333",
  },
  infoBox: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#0066cc",
    lineHeight: 18,
  },
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 14,
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
});
