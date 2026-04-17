import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
  loading?: boolean;
}

export function ErrorView({ message, onRetry, loading }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1976d2" />
      ) : (
        <>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.message}>{message}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
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
  },
  message: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});