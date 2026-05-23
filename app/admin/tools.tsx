import { useState } from "react";
import { StyleSheet } from "react-native";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FormButton } from "@/src/components/form/FormButton";
import { FormInput } from "@/src/components/form/FormInput";
import { FormPanel } from "@/src/components/shared/FormPanel";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
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
    showToast({ variant: "success", message: "La app mobile usará este Bearer token en adelante." });
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Herramientas"
      title="Utilidades avanzadas"
      description="Opciones de soporte y desarrollo fuera del flujo principal."
    >
      <FormPanel
        eyebrow="Token manual"
        title="Sobrescribe la sesión desde Swagger"
        testID="tools-token-panel"
      >
        <FormInput
          label="JWT sin el prefijo Bearer"
          placeholder="eyJhbGciOi..."
          value={manualToken}
          onChangeText={setManualToken}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          style={styles.tokenInput}
          testID="tools-token-input"
          accessibilityLabel="Campo de token JWT manual"
        />
        <FormButton
          variant="primary"
          onPress={onSaveToken}
          testID="tools-save-token-btn"
          accessibilityLabel="Guardar token manual"
        >
          Guardar token
        </FormButton>
      </FormPanel>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  tokenInput: {
    minHeight: 180,
    textAlignVertical: "top",
  },
});
