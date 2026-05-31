import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { withHapticFeedback } from "@/src/utils/haptics";

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
          onPress={withHapticFeedback(onAction, "light")}
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
    padding: designTokens.spacing.xxxl,
  },
  icon: {
    fontSize: designTokens.typography.display.fontSize,
    marginBottom: designTokens.spacing.lg,
    color: designTokens.color.ink.muted,
    fontWeight: "300",
  },
  title: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "600",
    color: designTokens.color.ink.secondary,
    textAlign: "center",
    marginBottom: designTokens.spacing.sm,
  },
  subtitle: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.muted,
    textAlign: "center",
  },
  actionButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingHorizontal: designTokens.spacing.xxl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    marginTop: designTokens.spacing.lg,
  },
  actionButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "600",
  },
});
