// Single source of truth for Dominican peso formatting (es-DO). Replaces ad-hoc
// `Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" })` / "RD$ " strings
// scattered across the app, so every amount renders identically.

/** "RD$ 1,234.50" — full amount, 2 decimals, es-DO grouping. Tolerates null/undefined. */
export function formatDOP(value: number | null | undefined): string {
  const v = Number.isFinite(value as number) ? (value as number) : 0;
  return `RD$ ${v.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact form for tight spaces: "RD$ 284.5K", "RD$ 1.2M". Tolerates null/undefined. */
export function formatDOPCompact(value: number | null | undefined): string {
  const v = Number.isFinite(value as number) ? (value as number) : 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `RD$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `RD$ ${(v / 1_000).toFixed(1)}K`;
  return formatDOP(v);
}
