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

/** Small status pill (Abierto/Cerrado, Activo/Inactivo, request states, …) with a semantic tone. */
export function StatusBadge({ label, tone = "neutral", testID }: { label: string; tone?: BadgeTone; testID?: string }) {
  const c = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]} testID={testID}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "700" },
});
