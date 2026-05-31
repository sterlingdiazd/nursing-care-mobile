import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { withHapticFeedback } from "@/src/utils/haptics";

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
        <Pressable onPress={withHapticFeedback(onRetry, "light")} style={styles.retry} accessibilityRole="button" accessibilityLabel={retryLabel}>
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: designTokens.spacing.huge, gap: designTokens.spacing.lg },
  message: { fontSize: designTokens.typography.body.fontSize, color: designTokens.color.ink.muted, textAlign: "center", paddingHorizontal: designTokens.spacing.xxl },
  errorText: { color: designTokens.color.status.dangerText },
  retry: { backgroundColor: designTokens.color.ink.accent, borderRadius: designTokens.radius.pill, paddingHorizontal: designTokens.spacing.xxl, paddingVertical: designTokens.spacing.md },
  retryText: { color: designTokens.color.ink.inverse, fontWeight: "800" },
});
