export type WorkCardTone = "danger" | "orange" | "warning" | "info" | "neutral";

export interface ToneStyle {
  color: string;
  soft: string;
  border: string;
}

export const toneStyles: Record<WorkCardTone, ToneStyle> = {
  danger: { color: "#dc2626", soft: "#fee2e2", border: "#ef4444" },
  orange: { color: "#ea580c", soft: "#ffedd5", border: "#f97316" },
  warning: { color: "#d99a00", soft: "#fef3c7", border: "#f2b705" },
  info: { color: "#0b6eea", soft: "#dbeafe", border: "#2583ff" },
  neutral: { color: "#475569", soft: "#e2e8f0", border: "#94a3b8" },
};
