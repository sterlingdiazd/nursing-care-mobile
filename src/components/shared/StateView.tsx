import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

type StateKind = "loading" | "empty" | "error";

/** Reusable loading / empty / error state with an optional retry, for list and detail screens. */
export function StateView({
  state,
  message,
  onRetry,
  retryLabel = "Reintentar",
  testID,
}: {
  state: StateKind;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  testID?: string;
}) {
  const defaultMessage = state === "loading" ? "Cargando..." : state === "empty" ? "No hay datos para mostrar." : "Ocurrió un error.";
  return (
    <View style={styles.wrap} testID={testID}>
      {state === "loading" ? <ActivityIndicator color={designTokens.color.ink.accent} /> : null}
      <Text style={[styles.message, state === "error" ? styles.errorText : null]}>{message ?? defaultMessage}</Text>
      {state === "error" && onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button" accessibilityLabel={retryLabel}>
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 14 },
  message: { fontSize: 14, color: designTokens.color.ink.muted, textAlign: "center", paddingHorizontal: 24 },
  errorText: { color: designTokens.color.status.dangerText },
  retry: { backgroundColor: designTokens.color.ink.accent, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: designTokens.color.ink.inverse, fontWeight: "800" },
});
