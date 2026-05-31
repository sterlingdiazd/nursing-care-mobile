import type { ComponentProps } from "react";
import type { DimensionValue } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { designTokens, type PaletteHue } from "@/src/design-system/tokens";
import { automationProps } from "@/src/utils/adminOperationalUx";
import { IconBadge } from "@/src/components/shared/IconBadge";

interface ModuleTileProps {
  icon: ComponentProps<typeof FontAwesome>["name"];
  /** Semantic hue for the icon badge — gives each module its own meaningful color. */
  hue: PaletteHue;
  label: string;
  onPress: () => void;
  testID: string;
  /** Grid width. Default "31%" for a 3-column layout. */
  width?: DimensionValue;
}

/**
 * Colorized module-grid tile: a white card with a soft-tinted circular icon badge and a
 * label. Replaces the monochrome gray-square tiles so each admin module reads by color.
 */
export function ModuleTile({ icon, hue, label, onPress, testID, width = "31%" }: ModuleTileProps) {
  return (
    <Pressable
      {...automationProps(testID)}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
    >
      <IconBadge icon={icon} hue={hue} size={42} iconSize={22} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  tile: {
    ...mobileSurfaceCard,
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: T.spacing.sm,
    padding: T.spacing.md,
  },
  label: {
    ...T.text.caption,
    // Nav affordance — keep the tile label bold so the grid reads as tappable.
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.78,
  },
});
