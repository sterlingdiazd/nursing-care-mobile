/**
 * Layout primitives — the mechanism that makes spacing harmony automatic.
 *
 * Every screen composes its body from these instead of hand-rolling margins, so
 * the spacing decision is made ONCE (here) and merely referenced. Gap/padding
 * props are SPACING-TOKEN KEYS (`keyof spacing`), never raw numbers, so an
 * off-scale value cannot reach a screen — it won't even type-check.
 *
 *   <Stack gap="lg">           vertical rhythm (the workhorse)
 *   <Cluster gap="sm">         horizontal group that wraps (chips, pills, tags)
 *   <Row gap="md">             horizontal row, no wrap (left/right layouts)
 *   <Inset all="lg">           uniform / asymmetric padding
 *   <Spacer size="lg" />       fixed gap, or flexible filler when size omitted
 *
 * Inspired by Every Layout (Pickering & Bell) and EightShapes' space-as-tokens.
 */
import { createElement, type ReactNode } from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";

import { designTokens, type SpacingToken } from "@/src/design-system/tokens";

export type Align = "start" | "center" | "end" | "stretch" | "baseline";
export type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

const ALIGN: Record<Align, NonNullable<ViewStyle["alignItems"]>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const JUSTIFY: Record<Justify, NonNullable<ViewStyle["justifyContent"]>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

/** Resolve a spacing-token key to its pixel value (the single conversion point). */
export function space(token?: SpacingToken): number | undefined {
  return token ? designTokens.spacing[token] : undefined;
}

// --- Pure style builders (unit-tested without rendering) ---------------------

export function stackStyle(gap: SpacingToken, align: Align): ViewStyle {
  return { flexDirection: "column", gap: space(gap), alignItems: ALIGN[align] };
}

export function clusterStyle(gap: SpacingToken, align: Align, justify: Justify, wrap: boolean): ViewStyle {
  return {
    flexDirection: "row",
    flexWrap: wrap ? "wrap" : "nowrap",
    gap: space(gap),
    alignItems: ALIGN[align],
    justifyContent: JUSTIFY[justify],
  };
}

export function rowStyle(gap: SpacingToken, align: Align, justify: Justify): ViewStyle {
  return {
    flexDirection: "row",
    gap: space(gap),
    alignItems: ALIGN[align],
    justifyContent: JUSTIFY[justify],
  };
}

export function insetStyle(p: {
  all?: SpacingToken;
  x?: SpacingToken;
  y?: SpacingToken;
  top?: SpacingToken;
  bottom?: SpacingToken;
  left?: SpacingToken;
  right?: SpacingToken;
}): ViewStyle {
  return {
    paddingTop: space(p.top ?? p.y ?? p.all),
    paddingBottom: space(p.bottom ?? p.y ?? p.all),
    paddingLeft: space(p.left ?? p.x ?? p.all),
    paddingRight: space(p.right ?? p.x ?? p.all),
  };
}

// --- Components --------------------------------------------------------------

interface StackProps extends ViewProps {
  gap?: SpacingToken;
  align?: Align;
  children?: ReactNode;
}

/** Vertical rhythm. The most-used primitive — one gap drives a whole column. */
export function Stack({ gap = "md", align = "stretch", style, children, ...rest }: StackProps) {
  return createElement(View, { style: [stackStyle(gap, align), style], ...rest }, children);
}

interface ClusterProps extends ViewProps {
  gap?: SpacingToken;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  children?: ReactNode;
}

/** Horizontal group that wraps like text (chips, pills, tags, badge + title). */
export function Cluster({
  gap = "sm",
  align = "center",
  justify = "start",
  wrap = true,
  style,
  children,
  ...rest
}: ClusterProps) {
  return createElement(View, { style: [clusterStyle(gap, align, justify, wrap), style], ...rest }, children);
}

interface RowProps extends ViewProps {
  gap?: SpacingToken;
  align?: Align;
  justify?: Justify;
  children?: ReactNode;
}

/** Horizontal row, no wrap — left/right layouts with flexed children. */
export function Row({ gap = "md", align = "center", justify = "start", style, children, ...rest }: RowProps) {
  return createElement(View, { style: [rowStyle(gap, align, justify), style], ...rest }, children);
}

interface InsetProps extends ViewProps {
  all?: SpacingToken;
  x?: SpacingToken;
  y?: SpacingToken;
  top?: SpacingToken;
  bottom?: SpacingToken;
  left?: SpacingToken;
  right?: SpacingToken;
  children?: ReactNode;
}

/** Uniform or asymmetric padding from the scale (the matte around content). */
export function Inset({ all, x, y, top, bottom, left, right, style, children, ...rest }: InsetProps) {
  return createElement(
    View,
    { style: [insetStyle({ all, x, y, top, bottom, left, right }), style], ...rest },
    children,
  );
}

interface SpacerProps {
  /** Fixed gap from the scale. Omit for a flexible filler (flex: 1). */
  size?: SpacingToken;
  axis?: "x" | "y";
}

/** A fixed token-sized gap, or a flexible filler (pushes siblings apart). */
export function Spacer({ size, axis = "y" }: SpacerProps) {
  if (!size) return createElement(View, { style: { flex: 1 } });
  return createElement(View, { style: axis === "y" ? { height: space(size) } : { width: space(size) } });
}
