import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { withHapticFeedback } from "@/src/utils/haptics";

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
  loading?: boolean;
}

export function ErrorView({ message, onRetry, loading }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
      ) : (
        <>
          <Text style={styles.icon}>!</Text>
          <Text style={styles.message}>{message}</Text>
          {onRetry && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={withHapticFeedback(onRetry, "light")}
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: designTokens.spacing.xxxl,
  },
  icon: {
    fontSize: designTokens.typography.display.fontSize,
    marginBottom: designTokens.spacing.lg,
    color: designTokens.color.ink.danger,
    fontWeight: "800",
  },
  message: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.muted,
    textAlign: "center",
    marginBottom: designTokens.spacing.lg,
  },
  retryButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingHorizontal: designTokens.spacing.xxl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
  },
  retryButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "600",
  },
});
