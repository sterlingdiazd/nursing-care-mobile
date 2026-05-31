import type { ReactNode } from "react";

import { SectionCard } from "@/src/components/shared/SurfaceCard";

interface FormPanelProps {
  eyebrow?: string;
  title?: string;
  /** "accent" highlights an active inline edit panel; "default" is a plain surface card. */
  tone?: "default" | "accent";
  children: ReactNode;
  /** Footer slot for action buttons (e.g. a WorkflowActionBar or FormButton row). */
  footer?: ReactNode;
  testID?: string;
}

/**
 * Inline edit / detail panel surface. Thin wrapper over the canonical
 * {@link SectionCard} so the `settingCard` / `editPanel` / `detailPanel` blocks
 * that settings, catalog and audit-logs each re-implemented all share one
 * surface, one density, one header treatment. Kept as a named export for the
 * existing call sites.
 */
export function FormPanel({ eyebrow, title, tone = "default", children, footer, testID }: FormPanelProps) {
  return (
    <SectionCard eyebrow={eyebrow} title={title} tone={tone} footer={footer} testID={testID}>
      {children}
    </SectionCard>
  );
}
