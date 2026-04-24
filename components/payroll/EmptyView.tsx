import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

interface EmptyViewProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyView({ title, subtitle, actionLabel, onAction }: EmptyViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>-</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
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
    color: designTokens.color.ink.muted,
    fontWeight: "300",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: designTokens.color.ink.muted,
    textAlign: "center",
  },
  actionButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  actionButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 15,
    fontWeight: "600",
  },
});
