export const designTokens = {
  color: {
    ink: {
      primary: "#111827",
      secondary: "#4b5563",
      muted: "#6b7280",
      inverse: "#ffffff",
      accent: "#007aff",
      danger: "#be123c",
      warning: "#92400e",
    },
    surface: {
      canvas: "#f2f2f7",
      primary: "#ffffff",
      secondary: "#f8fafc",
      accent: "#eff6ff",
      warning: "#fff7ed",
      danger: "#fff1f2",
      success: "#ecfdf5",
    },
    border: {
      subtle: "#e5e7eb",
      strong: "#d1d5db",
      accent: "#bfdbfe",
      warning: "#fed7aa",
      danger: "#fecdd3",
      success: "#bbf7d0",
    },
    status: {
      infoBg: "#dbeafe",
      infoText: "#1e40af",
      successBg: "#d1fae5",
      successText: "#065f46",
      warningBg: "#fef3c7",
      warningText: "#92400e",
      dangerBg: "#fee2e2",
      dangerText: "#991b1b",
    },
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    xxl: 28,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.03,
      shadowRadius: 12,
      elevation: 2,
    },
    raised: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 3,
    },
    accent: {
      shadowColor: "#007aff",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 4,
    },
  },
  typography: {
    title: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800" as const,
    },
    sectionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800" as const,
    },
    body: {
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "400" as const,
    },
    label: {
      fontSize: 14,
      fontWeight: "700" as const,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: "700" as const,
      letterSpacing: 1.2,
      textTransform: "uppercase" as const,
    },
  },
} as const;

export type DesignTokens = typeof designTokens;
