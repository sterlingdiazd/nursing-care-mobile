export const designTokens = {
  color: {
    ink: {
      primary: "#0F1F33",
      secondary: "#475569",
      muted: "#5B6B7F",
      inverse: "#ffffff",
      accent: "#2563EB",
      accentStrong: "#1D4ED8",
      danger: "#DC2626",
      warning: "#D97706",
    },
    surface: {
      canvas: "#F6F7FB",
      primary: "#FFFFFF",
      secondary: "#F1F5F9",
      tertiary: "#E2E8F0",
      accent: "#DBEAFE",
      warning: "#FEF3C7",
      danger: "#FEE2E2",
      success: "#DCFCE7",
    },
    border: {
      subtle: "#E2E8F0",
      strong: "#CBD5E1",
      accent: "#BFDBFE",
      warning: "#FDE68A",
      danger: "#FECACA",
      success: "#BBF7D0",
    },
    status: {
      infoBg: "#DBEAFE",
      infoText: "#1D4ED8",
      successBg: "#DCFCE7",
      successText: "#15803D",
      warningBg: "#FEF3C7",
      warningText: "#B45309",
      dangerBg: "#FEE2E2",
      dangerText: "#B91C1C",
    },
    // Vivid semantic hue map — one source of truth for icon badges, action cards,
    // module tiles, and any colored accent. Per hue:
    //   color  — icon/rail/outline grade, AA >=3:1 (graphical) on its soft tint AND on white;
    //   soft   — 100-grade light tint background (carries dark ink/`text` at AA);
    //   border — 300-grade DECORATIVE hairline ONLY — NOT AA as a load-bearing outline
    //            (~1.3-2:1); use `color` for any meaningful outline/rail/divider;
    //   text   — 800-grade, for hue-colored TEXT on the soft tint or white (AA 4.5:1
    //            even at small/bold sizes). Use `text` for labels, `color` for glyphs/rails.
    // amber/green `color` are 700-grade (their 600 fails 3:1 on the soft tint).
    palette: {
      blue: { color: "#2563EB", soft: "#DBEAFE", border: "#93C5FD", text: "#1E40AF" },
      teal: { color: "#0D9488", soft: "#CCFBF1", border: "#5EEAD4", text: "#115E59" },
      green: { color: "#15803D", soft: "#DCFCE7", border: "#86EFAC", text: "#166534" },
      amber: { color: "#B45309", soft: "#FEF3C7", border: "#FCD34D", text: "#92400E" },
      orange: { color: "#EA580C", soft: "#FFEDD5", border: "#FDBA74", text: "#9A3412" },
      red: { color: "#DC2626", soft: "#FEE2E2", border: "#FCA5A5", text: "#991B1B" },
      purple: { color: "#7C3AED", soft: "#EDE9FE", border: "#C4B5FD", text: "#5B21B6" },
      indigo: { color: "#4F46E5", soft: "#E0E7FF", border: "#A5B4FC", text: "#3730A3" },
      pink: { color: "#DB2777", soft: "#FCE7F3", border: "#F9A8D4", text: "#9D174D" },
      neutral: { color: "#475569", soft: "#F1F5F9", border: "#CBD5E1", text: "#334155" },
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
      boxShadow: "0px 6px 18px rgba(18, 48, 68, 0.06)",
elevation: 2,
    },
    raised: {
      boxShadow: "0px 12px 24px rgba(18, 48, 68, 0.08)",
elevation: 3,
    },
    accent: {
      boxShadow: "0px 8px 20px rgba(37, 99, 235, 0.16)",
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
export type PaletteHue = keyof typeof designTokens.color.palette;
