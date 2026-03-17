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
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import {
  clearClientLogs,
  logClientEvent,
  useClientLogs,
} from "@/src/logging/clientLogger";
import {
  checkBackendHealth,
  getMobileApiBaseUrl,
} from "@/src/services/authService";

export default function AuthScreen() {
  const { email, isAuthenticated, login, logout, roles, setTokenManually, token } =
    useAuth();
  const logs = useClientLogs();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const apiBaseUrl = getMobileApiBaseUrl();

  const onLogin = async () => {
    if (!loginEmail || !loginPassword) {
      logClientEvent("mobile.ui", "Login blocked by missing fields");
      Alert.alert("Missing fields", "Enter both email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedEmail = loginEmail.trim();
      const response = await login(trimmedEmail, loginPassword);
      setLoginPassword("");
      setManualToken("");
      logClientEvent("mobile.ui", "Login succeeded", {
        email: trimmedEmail,
        correlationId: response.correlationId,
      });
      Alert.alert("Signed in", "Bearer token loaded from the backend.");
    } catch (error: any) {
      logClientEvent(
        "mobile.ui",
        "Login failed",
        { email: loginEmail, message: error.message || "Unable to sign in." },
        "error",
      );
      Alert.alert("Login failed", error.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSaveToken = () => {
    if (!manualToken.trim()) {
      logClientEvent("mobile.ui", "Manual token save blocked by empty value");
      Alert.alert("Missing token", "Paste the JWT token from Swagger first.");
      return;
    }

    setTokenManually(manualToken);
    setManualToken("");
    logClientEvent("mobile.ui", "Manual token saved");
    Alert.alert("Token saved", "The mobile app will now send this Bearer token.");
  };

  const onCheckBackend = async () => {
    setIsCheckingBackend(true);

    try {
      const health = await checkBackendHealth();
      logClientEvent("mobile.ui", "Backend health check succeeded", health);
      Alert.alert(
        "Backend reachable",
        `Status: ${health.status}\nDatabase: ${health.database}`,
      );
    } catch (error: any) {
      logClientEvent(
        "mobile.ui",
        "Backend health check failed",
        { message: error.message || "Unable to reach backend." },
        "error",
      );
      Alert.alert(
        "Backend unreachable",
        error.message || "Unable to reach backend.",
      );
    } finally {
      setIsCheckingBackend(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Auth</Text>
        <Text style={styles.subtitle}>
          Sign in with your backend credentials or paste the same JWT token you
          used in Swagger.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>
            {isAuthenticated ? "Authenticated" : "Not authenticated"}
          </Text>
          <Text style={styles.statusValue}>
            {email ?? "No user email loaded"}
          </Text>
          <Text style={styles.roles}>
            Roles: {roles.length > 0 ? roles.join(", ") : "No roles loaded"}
          </Text>
          <Text style={styles.tokenHint}>
            Token: {token ? `${token.slice(0, 18)}...` : "No token loaded"}
          </Text>
          <Text style={styles.tokenHint}>API: {apiBaseUrl}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              isCheckingBackend && styles.buttonDisabled,
            ]}
            onPress={onCheckBackend}
            disabled={isCheckingBackend}
          >
            {isCheckingBackend ? (
              <ActivityIndicator color="#1d4ed8" />
            ) : (
              <Text style={styles.secondaryButtonText}>Test Backend Connection</Text>
            )}
          </Pressable>
          {isAuthenticated && (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                logClientEvent("mobile.ui", "Clear token tapped");
                logout();
              }}
            >
              <Text style={styles.secondaryButtonText}>Clear Token</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Login</Text>
          <TextInput
            value={loginEmail}
            onChangeText={setLoginEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={loginPassword}
            onChangeText={setLoginPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
          />
          <Pressable
            onPress={onLogin}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !isSubmitting && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Login And Load Token</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Paste Token</Text>
          <Text style={styles.helpText}>
            If you already authorized Swagger, paste only the JWT value here,
            without the word Bearer.
          </Text>
          <TextInput
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="eyJhbGciOi..."
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.tokenInput]}
          />
          <Pressable
            onPress={onSaveToken}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Save Bearer Token</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>Client Logs</Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => clearClientLogs()}
            >
              <Text style={styles.secondaryButtonText}>Clear Logs</Text>
            </Pressable>
          </View>
          {logs.length === 0 ? (
            <Text style={styles.helpText}>No client logs yet.</Text>
          ) : (
            logs.slice(0, 20).map((log) => (
              <View key={log.id} style={styles.logEntry}>
                <Text style={styles.logMeta}>
                  {log.timestamp} {log.level.toUpperCase()} {log.source}
                </Text>
                <Text style={styles.logCorrelation}>
                  Correlation ID: {log.correlationId}
                </Text>
                <Text style={styles.logMessage}>{log.message}</Text>
                {Boolean(log.data) && (
                  <Text style={styles.logData}>
                    {String(JSON.stringify(log.data, null, 2))}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    marginBottom: 18,
  },
  statusCard: {
    backgroundColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#1d4ed8",
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 6,
  },
  roles: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 6,
  },
  tokenHint: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  tokenInput: {
    minHeight: 140,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  logEntry: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    marginTop: 12,
  },
  logMeta: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  logCorrelation: {
    fontSize: 12,
    color: "#1d4ed8",
    marginBottom: 4,
  },
  logData: {
    fontSize: 12,
    lineHeight: 18,
    color: "#334155",
  },
});
