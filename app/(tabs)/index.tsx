import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { logClientEvent } from "@/src/logging/clientLogger";

export default function TabOneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>MVP Use Cases</Text>
      <Text style={styles.title}>Nursing Care Workspace</Text>
      <Text style={styles.description}>
        Start a new care request and move through the form without the keyboard
        covering your fields.
      </Text>

      <Pressable
        onPress={() => {
          logClientEvent("mobile.ui", "Navigate to create care request");
          router.push("/create-care-request");
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>Create Care Request</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f8fafc",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#2563eb",
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#475569",
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
