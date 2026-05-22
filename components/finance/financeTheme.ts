import type { HealthStatus } from "@/src/services/financeService";
import { formatDOP, formatDOPCompact } from "@/src/utils/currency";

// Self-contained dark palette for the finance dashboard (the rest of the app stays light).
// Derived from the brand navy/teal so it still feels like the same product.
export const financeTheme = {
  bg: "#0E1F2B",
  bgElevated: "#102A38",
  card: "#16313F",
  cardBorder: "#244554",
  cardSoft: "#1B3A4A",
  text: "#EAF2F5",
  textMuted: "#9FB7C2",
  accent: "#48B6D8",
  accentDeep: "#1D5D80",
  navy: "#123044",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
  radius: 20,
  radiusSm: 14,
  // Gradient stops for the hero card.
  heroGradient: ["#123044", "#1D5D80", "#2E7DA3"] as const,
} as const;

export function statusColor(status: HealthStatus): string {
  return status === "green" ? financeTheme.green : status === "amber" ? financeTheme.amber : financeTheme.red;
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
