import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";

export default function TabOneScreen() {
  const { email, isAuthenticated, roles } = useAuth();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Care Request Workspace</Text>
        <Text style={styles.title}>Launch the request flow from one focused home base.</Text>
        <Text style={styles.description}>
          The main action below opens the request board so you can browse live requests, drill into
          detail, and move them through the lifecycle. If you are not signed in yet, the secondary
          action takes you straight to Auth and diagnostics.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>
            {isAuthenticated ? "Authenticated" : "Authentication needed"}
          </Text>
          <Text style={styles.statusValue}>
            {email ?? "No account loaded in this session"}
          </Text>
          <Text style={styles.statusMeta}>
            Roles: {roles.length > 0 ? roles.join(", ") : "No roles loaded"}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              logClientEvent("mobile.ui", "Home CTA opened care requests list");
              router.push("/care-requests" as never);
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Open Request Board</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              logClientEvent("mobile.ui", "Home CTA opened auth tab");
              router.push("/three");
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {isAuthenticated ? "Review Auth & Logs" : "Load Token First"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Ready now</Text>
          <Text style={styles.cardTitle}>Request intake</Text>
          <Text style={styles.cardBody}>
            Start a new request, validate the resident GUID, and submit without leaving the guided
            flow.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Visibility</Text>
          <Text style={styles.cardTitle}>Correlation-aware logs</Text>
          <Text style={styles.cardBody}>
            Every client-side event already carries a correlation ID so it can be matched to the
            backend request log.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#eef3fb",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    flexGrow: 1,
  },
  hero: {
    backgroundColor: "#0f2358",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#93c5fd",
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: "#dbeafe",
  },
  statusCard: {
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#fbbf24",
    marginBottom: 6,
  },
  statusValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 6,
  },
  statusMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: "#cbd5e1",
  },
  actionRow: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#fef3c7",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  buttonPressed: {
    opacity: 0.92,
  },
  primaryButtonText: {
    color: "#132d75",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  grid: {
    marginTop: 18,
    gap: 14,
  },
  card: {
    backgroundColor: "#fffdf9",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: "#2563eb",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102a43",
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#52637a",
  },
});
