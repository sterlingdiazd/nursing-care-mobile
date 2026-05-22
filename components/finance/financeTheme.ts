import type { HealthStatus } from "@/src/services/financeService";

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

const dop = new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 });

export function fmtMoney(value: number): string {
  return dop.format(value ?? 0);
}

/** Compact money for tight spaces: RD$ 284.5K, RD$ 1.2M. */
export function fmtMoneyCompact(value: number): string {
  const v = value ?? 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `RD$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `RD$ ${(v / 1_000).toFixed(1)}K`;
  return dop.format(v);
}

/** "+12.0%" / "−3.0%" / null when no comparison. */
export function fmtDeltaPercent(deltaPercent: number | null): string | null {
  if (deltaPercent == null) return null;
  const sign = deltaPercent > 0 ? "+" : deltaPercent < 0 ? "−" : "";
  return `${sign}${Math.abs(deltaPercent).toFixed(1)}%`;
}
