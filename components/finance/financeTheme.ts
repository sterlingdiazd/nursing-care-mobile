import { designTokens } from "@/src/design-system/tokens";
import type { HealthStatus } from "@/src/services/financeService";
import { formatDOP, formatDOPCompact } from "@/src/utils/currency";

const c = designTokens.color;

// Light palette for the finance dashboard — uses the shared design-token system so
// it stays in sync with the rest of the app (light teal canvas, white cards, navy ink).
export const financeTheme = {
  // Surfaces
  bg: c.surface.canvas,         // #eef6f7  — screen canvas
  bgElevated: c.surface.secondary, // #f3f9fa — slightly elevated surface
  card: c.surface.primary,      // #fcfefd  — white card
  cardBorder: c.border.subtle,  // #d8e6ea
  cardSoft: c.surface.tertiary, // #e6f2f4  — light tint (donut track, bar track)

  // Ink
  text: c.ink.primary,          // #123044  — navy
  textMuted: c.ink.muted,       // #6f8796
  accent: c.ink.accent,         // #2e7da3  — teal
  accentDeep: c.ink.accentStrong, // #1d5d80
  navy: c.ink.primary,          // #123044

  // Status colours (text)
  green: c.status.successText,  // #0f6b54
  amber: c.status.warningText,  // #8c5a14
  red: c.status.dangerText,     // #9f1239

  // Status surfaces (for background pills / rails)
  greenBg: c.status.successBg,  // #dff4e8
  amberBg: c.status.warningBg,  // #fff0ca
  redBg: c.status.dangerBg,     // #fde1e8

  // Shape
  radius: 20,
  radiusSm: 14,
} as const;

export function statusColor(status: HealthStatus): string {
  return status === "green"
    ? financeTheme.green
    : status === "amber"
      ? financeTheme.amber
      : financeTheme.red;
}

export function statusBgColor(status: HealthStatus): string {
  return status === "green"
    ? financeTheme.greenBg
    : status === "amber"
      ? financeTheme.amberBg
      : financeTheme.redBg;
}

// Money formatting delegates to the shared DOP util (single source of truth across the app).
export const fmtMoney = formatDOP;
export const fmtMoneyCompact = formatDOPCompact;

/** "+12.0%" / "−3.0%" / null when no comparison. */
export function fmtDeltaPercent(deltaPercent: number | null): string | null {
  if (deltaPercent == null) return null;
  const sign = deltaPercent > 0 ? "+" : deltaPercent < 0 ? "−" : "";
  return `${sign}${Math.abs(deltaPercent).toFixed(1)}%`;
}
