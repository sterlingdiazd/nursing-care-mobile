import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = "Cargando..." }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
      <Text style={styles.message}>{message}</Text>
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
  message: {
    fontSize: 15,
    color: designTokens.color.ink.muted,
    marginTop: 16,
  },
});
