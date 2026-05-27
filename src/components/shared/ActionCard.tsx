import type { ComponentProps } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens, type PaletteHue } from "@/src/design-system/tokens";
import { automationProps } from "@/src/utils/adminOperationalUx";
import { IconBadge } from "@/src/components/shared/IconBadge";

interface ActionCardProps {
  icon: ComponentProps<typeof FontAwesome>["name"];
  /** Semantic hue — drives the icon badge, count pill, outline button, and left rail. */
  hue: PaletteHue;
  title: string;
  subtitle: string;
  /** Pre-formatted pill text (e.g. "3 pendientes"). Pill is hidden when omitted. */
  countText?: string;
  actionLabel: string;
  onPress: () => void;
  /** Defaults to the hue's vivid color so the urgency rail matches the badge. */
  railColor?: string;
  testID: string;
  accessibilityLabel?: string;
  /** Layout override (e.g. flex:1 to fill a distributed column). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Canonical "work card": soft-tinted circular icon badge, title/subtitle, optional count
 * pill, a colored outline action button, and a 4px urgency rail — all in one semantic hue.
 * Extracted from the admin home so the look is reusable and consistent app-wide.
 */
export function ActionCard({
  icon,
  hue,
  title,
  subtitle,
  countText,
  actionLabel,
  onPress,
  railColor,
  testID,
  accessibilityLabel,
  style,
}: ActionCardProps) {
  const tone = designTokens.color.palette[hue];

  return (
    <Pressable
      {...automationProps(testID)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: railColor ?? tone.color },
        style,
        pressed && styles.pressed,
      ]}
    >
      <IconBadge icon={icon} hue={hue} size={62} iconSize={30} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        {countText ? (
          <View style={[styles.countPill, { backgroundColor: tone.soft }]}>
            {/* tone.text (-800) keeps small bold label >=4.5:1 on the soft tint (AA). */}
            <Text style={[styles.countPillText, { color: tone.text }]}>{countText}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.action}>
        {/* border uses tone.color (-600, graphical 3:1); label uses tone.text (-800) for AA. */}
        <View style={[styles.actionButton, { borderColor: tone.color }]}>
          <Text style={[styles.actionButtonText, { color: tone.text }]}>{actionLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...mobileSurfaceCard,
    minHeight: 106,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderLeftWidth: 4,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  title: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    fontWeight: "600",
  },
  countPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countPillText: {
    fontSize: 13,
    fontWeight: "800",
  },
  action: {
    alignItems: "flex-end",
    gap: 16,
  },
  actionButton: {
    minWidth: 86,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.78,
  },
});
