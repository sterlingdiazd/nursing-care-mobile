import { designTokens } from "./tokens";

export const mobileTheme = {
  colors: designTokens.color,
  radius: designTokens.radius,
  spacing: designTokens.spacing,
  typography: designTokens.typography,
  shadows: designTokens.shadow,
} as const;

export const mobileSurfaceCard = {
  backgroundColor: mobileTheme.colors.surface.primary,
  borderRadius: mobileTheme.radius.xl,
  borderWidth: 1,
  borderColor: mobileTheme.colors.border.subtle,
  ...mobileTheme.shadows.raised,
} as const;

export const mobileSecondarySurface = {
  backgroundColor: mobileTheme.colors.surface.secondary,
  borderRadius: mobileTheme.radius.lg,
  borderWidth: 1,
  borderColor: mobileTheme.colors.border.subtle,
} as const;

export const mobilePrimaryButton = {
  backgroundColor: mobileTheme.colors.ink.accent,
  borderRadius: mobileTheme.radius.md,
  alignItems: "center" as const,
} as const;

export const mobileSecondaryButton = {
  backgroundColor: mobileTheme.colors.surface.primary,
  borderRadius: mobileTheme.radius.md,
  borderWidth: 1,
  borderColor: mobileTheme.colors.border.strong,
  alignItems: "center" as const,
} as const;

export const mobileAdminActionButton = {
  backgroundColor: mobileTheme.colors.surface.secondary,
  borderRadius: mobileTheme.radius.md,
  borderWidth: 1,
  borderColor: mobileTheme.colors.border.strong,
  alignItems: "center" as const,
} as const;

export const mobileAdminActionButtonText = {
  color: mobileTheme.colors.ink.secondary,
  fontWeight: "700" as const,
  fontSize: 14,
  textAlign: "center" as const,
} as const;

export const mobilePill = {
  borderRadius: mobileTheme.radius.pill,
} as const;
