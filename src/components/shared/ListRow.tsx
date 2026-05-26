import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { hapticFeedback } from "@/src/utils/haptics";

interface ListRowProps {
  title: string;
  /** Right-of-title slot, typically a <StatusBadge/>. */
  badge?: ReactNode;
  subtitle?: string;
  /** Muted secondary lines; falsy entries are dropped so callers can compose conditionally. */
  metaLines?: Array<string | null | undefined | false>;
  /** 4px left rail color — reserve for urgency (overdue, action-required), never plain status. */
  railColor?: string;
  /** Emphasized trailing value (one number per row max). */
  rightText?: string;
  /** Replaces the default chevron when provided. */
  rightAccessory?: ReactNode;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  children?: ReactNode;
}

/**
 * Canonical pressable list row used across the admin lists (users, clients,
 * nurses, shifts, audit, payroll). Soft-shadow surface card, one emphasized
 * number per row, optional urgency rail. Replaces the per-screen ad-hoc cards.
 */
export function ListRow({
  title,
  badge,
  subtitle,
  metaLines,
  railColor,
  rightText,
  rightAccessory,
  onPress,
  testID,
  accessibilityLabel,
  children,
}: ListRowProps) {
  const meta = (metaLines ?? []).filter(Boolean) as string[];
  const showChevron = Boolean(onPress) && !rightAccessory && !rightText;

  // The tappable content and the rightAccessory are rendered as SIBLINGS inside the card,
  // never parent/child. Nesting an interactive rightAccessory (e.g. a delete button) inside
  // the row's Pressable produced a <button>-in-<button> hydration error on web.
  const mainContent = (
    <>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {badge ?? null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {meta.map((line, i) => (
          <Text key={i} style={styles.meta}>{line}</Text>
        ))}
        {children}
      </View>
      {rightText ? <Text style={styles.rightText}>{rightText}</Text> : null}
      {showChevron ? <Text style={styles.chevron}>›</Text> : null}
    </>
  );

  const handlePress = () => {
    hapticFeedback.light();
    onPress?.();
  };

  return (
    <View style={styles.card} testID={onPress ? undefined : testID} nativeID={onPress ? undefined : testID}>
      {railColor ? <View style={[styles.rail, { backgroundColor: railColor }]} /> : null}
      {onPress ? (
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          testID={testID}
          nativeID={testID}
          style={({ pressed }) => [styles.pressArea, pressed && styles.cardPressed]}
        >
          {mainContent}
        </Pressable>
      ) : (
        <View style={styles.pressArea}>{mainContent}</View>
      )}
      {rightAccessory ?? null}
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  card: {
    ...mobileSurfaceCard,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.85 },
  pressArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  rail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: { flex: 1, gap: 2 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: T.color.ink.primary, fontWeight: "800", fontSize: 16, flex: 1 },
  subtitle: { color: T.color.ink.secondary, fontSize: 13, fontWeight: "600" },
  meta: { color: T.color.ink.muted, fontSize: 13 },
  rightText: { color: T.color.ink.primary, fontWeight: "800", fontSize: 15 },
  chevron: { color: T.color.ink.muted, fontSize: 24, fontWeight: "700", marginLeft: 2 },
});
