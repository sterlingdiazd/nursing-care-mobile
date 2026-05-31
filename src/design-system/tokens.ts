// Single source of truth for the mobile design system.
//
// The discipline: a screen NEVER chooses a raw value — it references a role.
//   - sizes/spacing/radius come from the scales below (spacing, radius);
//   - text comes from the type ramp (`typography`) or, preferably, the composed
//     `text` map which bakes the right weight AND color into each role;
//   - color comes from the semantic `role` map (one meaning, one role, everywhere).
// Off-scale numbers and raw hex are rejected by the lint gate (.eslintrc.js) so
// drift fails the build instead of accumulating into the "different developer" look.

const color = {
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
} as const;

const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

// One geometric spacing scale. Composed ONLY through the layout primitives
// (Stack/Inset/Cluster) so the gap decision is made once. `xxxl`/`huge` are the
// section-break / empty-state rungs (previously improvised as raw 32/40/48).
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

const shadow = {
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
} as const;

// The type ramp — a constrained set of roles. Screens reference a role, never a
// raw fontSize. Hierarchy comes from weight + color (see `text`/`role`), not from
// inventing in-between sizes. `sectionTitle` is kept as a back-compat alias of
// `section`. body is 15 (was 14) — the most-used real body size, and it reads
// better on dense Spanish copy.
const typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800" as const,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800" as const,
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800" as const,
  },
  // Back-compat alias for `section` (legacy callers used `sectionTitle`).
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800" as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700" as const,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
} as const;

// Layout constants shared by the screen scaffold. The screen gutter is 18 — a
// deliberate value between lg(16) and xl(20); kept as one source of truth so the
// shell and any full-bleed child align to the same left edge.
const layout = {
  screenPaddingX: 18,
} as const;

// Semantic COLOR roles — one meaning, one role, everywhere. A primary action is
// ALWAYS role.action.primary (never ink.accent / palette.blue directly); danger
// is ALWAYS role.action.danger. This is what makes color read as intentional
// across screens instead of chosen per screen.
const role = {
  text: {
    default: color.ink.primary,
    muted: color.ink.muted,
    subtle: color.ink.secondary,
    inverse: color.ink.inverse,
    accent: color.ink.accent,
    danger: color.ink.danger,
    warning: color.ink.warning,
  },
  action: {
    primary: color.ink.accent,
    primaryStrong: color.ink.accentStrong,
    danger: color.ink.danger,
    warning: color.ink.warning,
  },
  surface: {
    canvas: color.surface.canvas,
    raised: color.surface.primary,
    sunken: color.surface.secondary,
    inset: color.surface.tertiary,
    accent: color.surface.accent,
  },
  border: {
    default: color.border.subtle,
    strong: color.border.strong,
    accent: color.border.accent,
  },
  // The single brand accent (foreground glyph/rail + soft tint background).
  accent: {
    fg: color.palette.blue.color,
    bg: color.palette.blue.soft,
  },
} as const;

// The text EMPHASIS ladder, baked in. Each ramp role carries its default weight
// AND default color so "loud vs quiet" is decided once, not per screen:
//   strong  (700-800 + text.default)  -> display/title/section/bodyStrong
//   default (400 + text.default)      -> body
//   muted   (gray + label/caption)    -> label/caption  (secondary/meta text)
// A screen picks `text.section` and gets the right size+weight+color in one go —
// it never hand-sets fontWeight or a text color. Fixes the "thin gray here,
// bold black there" inconsistency.
// NOTE: the muted tier uses `ink.secondary` (#475569, ~4.6:1 on white), NOT the
// lighter `ink.muted` (#5B6B7F, ~3.5:1) — small secondary text (label/caption)
// must clear WCAG AA 4.5:1. `role.text.muted` keeps the lighter grade for larger
// or non-text de-emphasis where AA-small does not apply.
const text = {
  display: { ...typography.display, color: color.ink.primary },
  title: { ...typography.title, color: color.ink.primary },
  section: { ...typography.section, color: color.ink.primary },
  body: { ...typography.body, color: color.ink.primary },
  bodyStrong: { ...typography.bodyStrong, color: color.ink.primary },
  label: { ...typography.label, color: color.ink.secondary },
  caption: { ...typography.caption, color: color.ink.secondary },
  eyebrow: { ...typography.eyebrow, color: color.ink.accentStrong },
} as const;

export const designTokens = {
  color,
  radius,
  spacing,
  shadow,
  typography,
  layout,
  role,
  text,
} as const;

export type DesignTokens = typeof designTokens;
export type PaletteHue = keyof typeof designTokens.color.palette;
export type SpacingToken = keyof typeof designTokens.spacing;
export type TypographyRole = keyof typeof designTokens.text;
