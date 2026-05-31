import { designTokens } from "@/src/design-system/tokens";
import type { HealthStatus } from "@/src/services/financeService";
import { formatDOP, formatDOPCompact } from "@/src/utils/currency";

const c = designTokens.color;

// Light palette for the finance dashboard — aliases the shared design-token system so
// it stays in sync with the rest of the app (neutral canvas, white cards, navy ink, blue
// accent). Values come from the tokens; do not hardcode hex here.
export const financeTheme = {
  // Surfaces
  bg: c.surface.canvas,         // screen canvas
  bgElevated: c.surface.secondary, // slightly elevated surface
  card: c.surface.primary,      // white card
  cardBorder: c.border.subtle,
  cardSoft: c.surface.tertiary, // light tint (donut track, bar track)

  // Ink
  text: c.ink.primary,          // navy
  textMuted: c.ink.muted,
  accent: c.ink.accent,         // brand blue
  accentDeep: c.ink.accentStrong,
  navy: c.ink.primary,

  // Status colours (text)
  green: c.status.successText,
  amber: c.status.warningText,
  red: c.status.dangerText,

  // Status surfaces (for background pills / rails)
  greenBg: c.status.successBg,
  amberBg: c.status.warningBg,
  redBg: c.status.dangerBg,

  // Shape — from the shared radius scale (do not hardcode integers here).
  radius: designTokens.radius.xl,
  radiusSm: designTokens.radius.md,
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
