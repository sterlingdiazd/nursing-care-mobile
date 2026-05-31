import { StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

export type BannerTone = "error" | "success" | "info" | "warning";

const TONES: Record<BannerTone, { bg: string; border: string; fg: string }> = {
  error: { bg: designTokens.color.surface.danger, border: designTokens.color.border.danger, fg: designTokens.color.status.dangerText },
  success: { bg: designTokens.color.surface.success, border: designTokens.color.border.success, fg: designTokens.color.status.successText },
  info: { bg: designTokens.color.surface.accent, border: designTokens.color.border.accent, fg: designTokens.color.ink.accentStrong },
  warning: { bg: designTokens.color.surface.warning, border: designTokens.color.border.warning, fg: designTokens.color.status.warningText },
};

/**
 * Inline status banner (error / success / info / warning). Replaces the
 * per-screen `errorBanner`/`successBanner` blocks so every surface speaks the
 * same visual language. Returns null for an empty message.
 */
export function Banner({ tone = "error", message, testID }: { tone?: BannerTone; message?: string | null; testID?: string }) {
  if (!message) return null;
  const c = TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]} testID={testID} nativeID={testID}>
      <Text style={[styles.text, { color: c.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
  },
  // color is overridden inline per tone (c.fg).
  text: { ...designTokens.text.label },
});
