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
  borderRadius: mobileTheme.radius.lg,
  borderWidth: 1,
  borderColor: mobileTheme.colors.border.subtle,
  // Canonical soft shadow — `shadows.raised` reads as a clipped gray smear on dense screens.
  boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
  elevation: 2,
} as const;

export const mobileSecondarySurface = {
  backgroundColor: mobileTheme.colors.surface.secondary,
  borderRadius: mobileTheme.radius.lg,
  borderWidth: 1,
  borderColor: mobileTheme.colors.border.subtle,
} as const;

export const mobilePrimaryButton = {
  backgroundColor: mobileTheme.colors.ink.accent,
  borderRadius: mobileTheme.radius.lg,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 48,
  ...mobileTheme.shadows.accent,
} as const;

export const mobileSecondaryButton = {
  backgroundColor: mobileTheme.colors.surface.primary,
  borderRadius: mobileTheme.radius.lg,
  borderWidth: 1,
  borderColor: mobileTheme.colors.border.strong,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 48,
} as const;

export const mobileAdminActionButton = {
  backgroundColor: mobileTheme.colors.surface.secondary,
  borderRadius: mobileTheme.radius.lg,
  borderWidth: 1,
  borderColor: mobileTheme.colors.border.strong,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 48,
} as const;

export const mobileAdminActionButtonText = {
  color: mobileTheme.colors.ink.secondary,
  fontWeight: "700" as const,
  fontSize: mobileTheme.typography.label.fontSize,
  textAlign: "center" as const,
} as const;

export const mobilePill = {
  borderRadius: mobileTheme.radius.pill,
} as const;
