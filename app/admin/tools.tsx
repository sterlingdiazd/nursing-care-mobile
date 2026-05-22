import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { mobilePrimaryButton, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { useToast } from "@/src/components/shared/ToastProvider";

export default function ToolsScreen() {
  const { setTokenManually } = useAuth();
  const { showToast } = useToast();
  const [manualToken, setManualToken] = useState("");

  const onSaveToken = () => {
    if (!manualToken.trim()) {
      logClientEvent("mobile.ui", "Manual token save blocked by empty value");
      showToast({ variant: "error", message: "Pega primero el JWT generado en Swagger." });
      return;
    }

    setTokenManually(manualToken);
    setManualToken("");
    logClientEvent("mobile.ui", "Manual token saved from tools screen");
    showToast({ variant: "success", message: "La app mobile usara este Bearer token en adelante." });
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Herramientas"
      title="Utilidades avanzadas"
      description="Opciones de soporte y desarrollo fuera del flujo principal."
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
          accessibilityRole="button"
          accessibilityLabel="Guardar token manual"
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
    ...mobileSurfaceCard,
    borderRadius: mobileTheme.radius.xl,
    padding: 20,
  },
  sectionEyebrow: {
    ...mobileTheme.typography.eyebrow,
    color: mobileTheme.colors.ink.muted,
    marginBottom: 8,
  },
  sectionTitle: {
    ...mobileTheme.typography.title,
    color: mobileTheme.colors.ink.primary,
    marginBottom: 10,
  },
  copy: {
    ...mobileTheme.typography.body,
    color: mobileTheme.colors.ink.secondary,
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: designTokens.color.ink.primary,
    backgroundColor: designTokens.color.ink.inverse,
  },
  tokenInput: {
    minHeight: 180,
    marginBottom: 16,
  },
  primaryButton: {
    ...mobilePrimaryButton,
    borderRadius: mobileTheme.radius.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 16,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
