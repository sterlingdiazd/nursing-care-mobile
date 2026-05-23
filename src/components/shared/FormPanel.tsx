import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";

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
 * Inline edit / detail panel surface. Unifies the `settingCard` / `editPanel` /
 * `detailPanel` blocks that settings, catalog and audit-logs each re-implemented.
 */
export function FormPanel({ eyebrow, title, tone = "default", children, footer, testID }: FormPanelProps) {
  return (
    <View style={[styles.panel, tone === "accent" && styles.panelAccent]} testID={testID} nativeID={testID}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  panel: {
    ...mobileSurfaceCard,
    padding: 16,
    gap: 10,
  },
  panelAccent: {
    backgroundColor: T.color.surface.accent,
    borderColor: T.color.border.accent,
  },
  eyebrow: { ...T.typography.eyebrow, color: T.color.ink.accentStrong },
  title: { fontSize: 16, fontWeight: "800", color: T.color.ink.primary },
  body: { gap: 10 },
  footer: { gap: 8, marginTop: 2 },
});
