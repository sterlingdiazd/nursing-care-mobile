import { designTokens } from "./tokens";

export type WorkCardTone = "danger" | "orange" | "warning" | "info" | "neutral";

export interface ToneStyle {
  color: string;
  soft: string;
  border: string;
  /** -800 grade for hue-colored text on the soft tint (AA 4.5:1 at small/bold sizes). */
  text: string;
}

// Semantic alias over the single palette source of truth (tokens.color.palette).
// Kept for the work-card / action-item consumers that think in terms of "tone".
export const toneStyles: Record<WorkCardTone, ToneStyle> = {
  danger: designTokens.color.palette.red,
  orange: designTokens.color.palette.orange,
  warning: designTokens.color.palette.amber,
  info: designTokens.color.palette.blue,
  neutral: designTokens.color.palette.neutral,
};
