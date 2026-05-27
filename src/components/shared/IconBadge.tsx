import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { designTokens, type PaletteHue } from "@/src/design-system/tokens";

interface IconBadgeProps {
  icon: ComponentProps<typeof FontAwesome>["name"];
  /** Semantic hue from the palette — drives both the tint background and the icon color. */
  hue: PaletteHue;
  /** Badge diameter. Default 48. */
  size?: number;
  /** Icon glyph size. Defaults to ~48% of the badge diameter. */
  iconSize?: number;
  testID?: string;
}

/**
 * Soft-tinted circular icon badge — the shared atom behind ActionCard and ModuleTile.
 * Reads the vivid semantic palette (tokens.color.palette) so every colored icon in the
 * app is consistent. Never hardcodes color (design-validator scans src/components).
 */
export function IconBadge({ icon, hue, size = 48, iconSize, testID }: IconBadgeProps) {
  const tone = designTokens.color.palette[hue];
  const glyphSize = iconSize ?? Math.round(size * 0.48);

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tone.soft },
      ]}
    >
      <FontAwesome name={icon} size={glyphSize} color={tone.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
});
