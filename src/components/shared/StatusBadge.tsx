import { StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

export type BadgeTone = "success" | "neutral" | "warning" | "danger" | "info";

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText },
  neutral: { bg: designTokens.color.surface.secondary, fg: designTokens.color.ink.muted },
  warning: { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText },
  danger: { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText },
  info: { bg: designTokens.color.surface.accent, fg: designTokens.color.ink.accentStrong },
};

/**
 * Small status pill (Abierto/Cerrado, Activo/Inactivo, request states, …).
 * Use a semantic `tone` for the standard palette, or pass explicit `colors` to preserve a
 * screen's established per-status palette (e.g. care-request / shift status colors).
 */
export function StatusBadge({
  label,
  tone = "neutral",
  colors,
  testID,
}: {
  label: string;
  tone?: BadgeTone;
  colors?: { bg: string; fg: string };
  testID?: string;
}) {
  const c = colors ?? TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]} testID={testID} nativeID={testID}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radius.sm,
    alignSelf: "flex-start",
  },
  // color is overridden inline per tone (c.fg).
  text: { ...designTokens.text.caption },
});
