import { Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

interface OfflineSnapshotBannerProps {
  capturedAtUtc?: string;
  onRetry?: () => void;
  retrying?: boolean;
  testID?: string;
}

function formatCapturedAt(iso?: string): string {
  if (!iso) return "datos guardados";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "datos guardados";
    return date.toLocaleString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "datos guardados";
  }
}

/**
 * Renders an amber banner above a screen that is showing cached data while
 * the backend is unreachable. Tap "Reintentar" to fetch fresh data — when it
 * succeeds the parent screen swaps the banner out for live data.
 */
export function OfflineSnapshotBanner({
  capturedAtUtc,
  onRetry,
  retrying = false,
  testID,
}: OfflineSnapshotBannerProps) {
  return (
    <View style={styles.container} testID={testID} nativeID={testID} accessibilityRole="alert">
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Sin conexión — mostrando últimos datos</Text>
        <Text style={styles.subtitle}>Capturado el {formatCapturedAt(capturedAtUtc)}.</Text>
      </View>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
          accessibilityRole="button"
          accessibilityLabel="Reintentar la conexión con el API"
          testID={testID ? `${testID}-retry` : undefined}
          nativeID={testID ? `${testID}-retry` : undefined}
        >
          <Text style={styles.retryText}>{retrying ? "Reintentando..." : "Reintentar"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md,
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.warning,
    borderRadius: designTokens.radius.md,
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.md,
  },
  title: {
    color: designTokens.color.status.warningText,
    fontWeight: "800",
    fontSize: designTokens.typography.body.fontSize,
  },
  subtitle: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "600",
    marginTop: designTokens.spacing.xs,
  },
  retryButton: {
    borderRadius: designTokens.radius.sm,
    borderWidth: 1,
    borderColor: designTokens.color.status.warningText,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  retryPressed: {
    opacity: 0.7,
  },
  retryText: {
    color: designTokens.color.status.warningText,
    fontWeight: "800",
    fontSize: designTokens.typography.label.fontSize,
  },
});
