import { StyleSheet, Text, View, ActivityIndicator } from "react-native";

interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = "Cargando..." }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1976d2" />
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
    color: "#666",
    marginTop: 16,
  },
});
