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
import { router } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { CreateCareRequestDto } from "@/src/types/careRequest";
import { createCareRequest } from "@/src/services/careRequestService";

const guidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    if (!guidPattern.test(form.residentId.trim())) {
      logClientEvent("mobile.ui", "Create care request blocked by invalid resident id", {
        residentId: form.residentId,
      });
      Alert.alert("Validation Error", "Resident ID must be a valid GUID.");
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
      const response = await createCareRequest(form);
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
            onPress: () => {
              resetForm();
              router.push({
                pathname: "/care-requests/[id]",
                params: { id: response.id },
              } as never);
            },
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
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Care Request Studio</Text>
            <Text style={styles.title}>Create a request with guided validation.</Text>
            <Text style={styles.subtitle}>
              Enter a real resident GUID, give enough operational detail, and submit using the
              active mobile session.
            </Text>
            <View
              style={[
                styles.authBadge,
                isAuthenticated ? styles.authReady : styles.authMissing,
              ]}
            >
              <Text
                style={[
                  styles.authBadgeText,
                  isAuthenticated ? styles.authReadyText : styles.authMissingText,
                ]}
              >
                {isAuthenticated ? "Bearer token loaded" : "No Bearer token loaded"}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Request details</Text>
              <Text style={styles.sectionCopy}>
                The request is submitted to the same protected backend used by the web client.
              </Text>
            </View>

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
            <Text
              style={[
                styles.helperText,
                form.residentId && !guidPattern.test(form.residentId.trim())
                  ? styles.helperError
                  : undefined,
              ]}
            >
              {form.residentId && !guidPattern.test(form.residentId.trim())
                ? "Use a GUID in 8-4-4-4-12 format."
                : "Example: 550e8400-e29b-41d4-a716-446655440000"}
            </Text>

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
            <Text style={styles.helperText}>
              {form.description.trim().length} characters
            </Text>

            <View style={styles.checklist}>
              <Text style={styles.checklistTitle}>Submission checklist</Text>
              <Text style={styles.checkItem}>
                {form.residentId ? "• Resident ID entered" : "• Resident ID missing"}
              </Text>
              <Text style={styles.checkItem}>
                {guidPattern.test(form.residentId.trim())
                  ? "• GUID format looks valid"
                  : "• GUID still needs validation"}
              </Text>
              <Text style={styles.checkItem}>
                {form.description.trim().length > 24
                  ? "• Description is specific enough to submit"
                  : "• Add a more specific description"}
              </Text>
            </View>

            <View style={styles.buttonRow}>
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

              <Pressable
                onPress={resetForm}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !isLoading && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Reset</Text>
              </Pressable>
            </View>

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
    paddingTop: 20,
    paddingBottom: 56,
  },
  hero: {
    backgroundColor: "#10295f",
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#93c5fd",
    marginBottom: 10,
  },
  title: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: "#dbeafe",
  },
  authBadge: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  authReady: {
    backgroundColor: "#dcfce7",
  },
  authMissing: {
    backgroundColor: "#fee2e2",
  },
  authBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  authReadyText: {
    color: "#166534",
  },
  authMissingText: {
    color: "#991b1b",
  },
  card: {
    backgroundColor: "#fffdf9",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102a43",
    marginBottom: 6,
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: "#52637a",
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
  helperText: {
    marginTop: -10,
    marginBottom: 16,
    fontSize: 12,
    color: "#64748b",
  },
  helperError: {
    color: "#dc2626",
    fontWeight: "700",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  checklist: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  checkItem: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1e3a5f",
    marginBottom: 4,
  },
  buttonRow: {
    gap: 12,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 15,
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
