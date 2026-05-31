import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { designTokens, type SpacingToken, type TypographyRole } from "@/src/design-system/tokens";
import { Cluster, Stack } from "@/src/design-system/primitives";

const T = designTokens;

/** One elevation ladder. Pick a rung by meaning — never an ad-hoc shadow. */
export type Elevation = "flat" | "card" | "raised";
/** Surface tone by meaning. `accent` = active/selected; `sunken` = nested/inset block. */
export type SurfaceTone = "default" | "accent" | "sunken";

const TONE: Record<SurfaceTone, ViewStyle> = {
  default: { backgroundColor: T.role.surface.raised, borderColor: T.role.border.default },
  accent: { backgroundColor: T.role.surface.accent, borderColor: T.role.border.accent },
  sunken: { backgroundColor: T.role.surface.sunken, borderColor: T.role.border.default },
};

const ELEVATION: Record<Elevation, ViewStyle> = {
  // No shadow at all — border-only. (No `boxShadow: "none"`: that is web-CSS, not RN.)
  flat: { elevation: 0 },
  // The canonical soft card shadow (mobileSurfaceCard) — never the heavier raised one for resting cards.
  card: { boxShadow: mobileSurfaceCard.boxShadow, elevation: mobileSurfaceCard.elevation },
  raised: { boxShadow: T.shadow.raised.boxShadow, elevation: T.shadow.raised.elevation },
};

interface SurfaceCardProps {
  tone?: SurfaceTone;
  elevation?: Elevation;
  /** Interior padding from the spacing scale. Default `lg` (16). */
  padding?: SpacingToken;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
}

/**
 * The canonical content surface. ONE card, used everywhere — replaces the ~20
 * hand-rolled `surface.primary` blocks each screen used to re-implement, so card
 * radius, border, shadow and density are identical app-wide ("one card per
 * pattern"). Compose its interior with the layout primitives (Stack/Cluster).
 */
export function SurfaceCard({
  tone = "default",
  elevation = "card",
  padding = "lg",
  style,
  children,
  testID,
}: SurfaceCardProps) {
  return (
    <View
      testID={testID}
      nativeID={testID}
      style={[styles.base, TONE[tone], ELEVATION[elevation], { padding: T.spacing[padding] }, style]}
    >
      {children}
    </View>
  );
}

interface SectionCardProps extends Omit<SurfaceCardProps, "children"> {
  eyebrow?: string;
  title?: string;
  /**
   * Type-ramp role for the title. Card-interior headings default to `bodyStrong`
   * (15) so they sit BELOW the shell screen title (22) in the hierarchy — pass
   * `section` (18) only for a prominent grouping card.
   */
  titleRole?: TypographyRole;
  /** Right-aligned header slot (e.g. a count, a small action). */
  headerAccessory?: ReactNode;
  /** Vertical rhythm inside the card body. Default `md`. */
  gap?: SpacingToken;
  /** Footer slot for action buttons (e.g. a WorkflowActionBar or FormButton row). */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * A SurfaceCard with a standard eyebrow/title header and a Stack body. Unifies
 * the `settingCard` / `editPanel` / `detailPanel` / FormPanel blocks that
 * settings, catalog and audit-logs each re-implemented. Title and eyebrow come
 * from the type ramp (emphasis baked in) so every section header reads the same.
 */
export function SectionCard({
  eyebrow,
  title,
  titleRole = "bodyStrong",
  headerAccessory,
  gap = "md",
  footer,
  children,
  ...surface
}: SectionCardProps) {
  const hasHeader = Boolean(eyebrow || title || headerAccessory);
  return (
    <SurfaceCard {...surface}>
      <Stack gap={gap}>
        {hasHeader ? (
          <Cluster justify="between" align="start" wrap={false}>
            <View style={styles.headerText}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              {title ? <Text style={designTokens.text[titleRole]}>{title}</Text> : null}
            </View>
            {headerAccessory ?? null}
          </Cluster>
        ) : null}
        {children}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Stack>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: T.radius.lg,
    borderWidth: 1,
  },
  headerText: {
    flex: 1,
    gap: T.spacing.xs,
  },
  eyebrow: T.text.eyebrow,
  footer: {
    gap: T.spacing.sm,
    marginTop: T.spacing.xs,
  },
});
