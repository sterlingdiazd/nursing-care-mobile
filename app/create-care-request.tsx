import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { CreateCareRequestDto } from "@/src/types/careRequest";
import { createCareRequest } from "@/src/services/careRequestService";

export default function CreateCareRequestScreen() {
  const { token, isAuthenticated } = useAuth();
  const [form, setForm] = useState<CreateCareRequestDto>({
    residentId: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ residentId: "", description: "" });
    setSuccessMessage(null);
  };

  const onSubmit = async () => {
    // Validation
    if (!form.residentId || !form.description) {
      logClientEvent("mobile.ui", "Create care request blocked by validation", {
        residentIdPresent: Boolean(form.residentId),
        descriptionPresent: Boolean(form.description),
      });
      Alert.alert("Validation Error", "All fields are required");
      return;
    }

    if (!token) {
      logClientEvent("mobile.ui", "Create care request blocked by missing token");
      Alert.alert(
        "Authentication Required",
        "Open the Auth tab and paste a Bearer token or log in before creating a care request.",
      );
      return;
    }

    // Prevent duplicate submissions
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage(null);
    logClientEvent("mobile.ui", "Create care request submitted", {
      residentId: form.residentId,
      descriptionLength: form.description.length,
    });

    try {
      const response = await createCareRequest(form, token);
      logClientEvent("mobile.ui", "Create care request succeeded", {
        correlationId: response.correlationId,
        residentId: form.residentId,
        createdId: response.id,
      });
      setSuccessMessage(`Successfully created care request: ${response.id}`);
      Alert.alert(
        "Success",
        `Care request created with ID: ${response.id}`,
        [
          {
            text: "OK",
            onPress: resetForm,
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.message || "Failed to create care request";
      logClientEvent(
        "mobile.ui",
        "Create care request failed",
        {
          residentId: form.residentId,
          errorMessage,
        },
        "error",
      );
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Care Request</Text>
            <Text style={styles.subtitle}>
              Fill in the resident information and request details below.
            </Text>
            <Text
              style={[
                styles.authBadge,
                isAuthenticated ? styles.authReady : styles.authMissing,
              ]}
            >
              {isAuthenticated
                ? "Bearer token loaded"
                : "No Bearer token loaded"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Resident ID</Text>
            <TextInput
              value={form.residentId}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, residentId: text }))
              }
              placeholder="GUID"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
              style={[
                styles.input,
                isLoading && styles.inputDisabled,
              ]}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={form.description}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, description: text }))
              }
              placeholder="Describe the care request..."
              multiline
              textAlignVertical="top"
              editable={!isLoading}
              style={[
                styles.input,
                styles.textArea,
                isLoading && styles.inputDisabled,
              ]}
            />

            <Pressable
              onPress={onSubmit}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.button,
                isLoading && styles.buttonDisabled,
                pressed && !isLoading && styles.buttonPressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Request</Text>
              )}
            </Pressable>

            {successMessage && (
              <Text style={styles.successMessage}>{successMessage}</Text>
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },
  authBadge: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },
  authReady: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  authMissing: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 160,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  successMessage: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#d1fae5",
    color: "#065f46",
    borderRadius: 10,
    overflow: "hidden",
  },
});
