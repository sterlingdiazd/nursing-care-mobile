import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

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
              onPress={onRetry}
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
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
    color: designTokens.color.ink.danger,
    fontWeight: "800",
  },
  message: {
    fontSize: 15,
    color: designTokens.color.ink.muted,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 15,
    fontWeight: "600",
  },
});
