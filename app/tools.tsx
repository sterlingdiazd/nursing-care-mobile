import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";

export default function ToolsScreen() {
  const { setTokenManually } = useAuth();
  const [manualToken, setManualToken] = useState("");

  const onSaveToken = () => {
    if (!manualToken.trim()) {
      logClientEvent("mobile.ui", "Manual token save blocked by empty value");
      Alert.alert("Falta el token", "Pega primero el JWT generado en Swagger.");
      return;
    }

    setTokenManually(manualToken);
    setManualToken("");
    logClientEvent("mobile.ui", "Manual token saved from tools screen");
    Alert.alert("Token guardado", "La app mobile usara este Bearer token en adelante.");
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Herramientas"
      title="Utilidades avanzadas para soporte y desarrollo."
      description="Estas opciones no forman parte del flujo principal de negocio. Se mantienen aparte para conservar una experiencia mas profesional y enfocada."
    >
      <View style={styles.card}>
        <Text style={styles.sectionEyebrow}>Token manual</Text>
        <Text style={styles.sectionTitle}>Sobrescribe la sesion desde Swagger</Text>
        <Text style={styles.copy}>
          Si ya autorizaste Swagger, pega aqui el JWT sin la palabra Bearer. Esto es util para depuracion local y pruebas manuales.
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
          <Text style={styles.primaryButtonText}>Guardar token manual</Text>
        </Pressable>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffdf9",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: "#2563eb",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#102a43",
    marginBottom: 10,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    color: "#52637a",
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  tokenInput: {
    minHeight: 180,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.92,
  },
});
