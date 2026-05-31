import { describe, expect, it } from "vitest";

import { designTokens } from "@/src/design-system/tokens";
import {
  clusterStyle,
  insetStyle,
  rowStyle,
  space,
  stackStyle,
} from "@/src/design-system/primitives";

const S = designTokens.spacing;

describe("layout primitives — token mapping", () => {
  it("space() resolves a spacing-token key to its scale value, never a raw number", () => {
    expect(space("lg")).toBe(S.lg);
    expect(space("xxxl")).toBe(S.xxxl);
    expect(space(undefined)).toBeUndefined();
  });

  it("Stack lays out a column with the requested token gap", () => {
    const s = stackStyle("lg", "stretch");
    expect(s.flexDirection).toBe("column");
    expect(s.gap).toBe(S.lg);
    expect(s.alignItems).toBe("stretch");
  });

  it("Cluster is a wrapping row with token gap and mapped align/justify", () => {
    const s = clusterStyle("sm", "center", "between", true);
    expect(s.flexDirection).toBe("row");
    expect(s.flexWrap).toBe("wrap");
    expect(s.gap).toBe(S.sm);
    expect(s.alignItems).toBe("center");
    expect(s.justifyContent).toBe("space-between");
  });

  it("Row is a non-wrapping row", () => {
    const s = rowStyle("md", "center", "start");
    expect(s.flexDirection).toBe("row");
    expect(s.gap).toBe(S.md);
    expect(s.justifyContent).toBe("flex-start");
  });

  it("Inset maps all/x/y/side shorthands to padding from the scale", () => {
    expect(insetStyle({ all: "lg" })).toMatchObject({
      paddingTop: S.lg,
      paddingBottom: S.lg,
      paddingLeft: S.lg,
      paddingRight: S.lg,
    });
    expect(insetStyle({ x: "xl", y: "sm" })).toMatchObject({
      paddingTop: S.sm,
      paddingBottom: S.sm,
      paddingLeft: S.xl,
      paddingRight: S.xl,
    });
    // most-specific side wins over x/y, which win over all
    expect(insetStyle({ all: "md", x: "lg", left: "xxl" }).paddingLeft).toBe(S.xxl);
  });
});

describe("type ramp + emphasis ladder", () => {
  it("exposes the 7 ramp roles plus the eyebrow", () => {
    for (const role of ["display", "title", "section", "body", "bodyStrong", "label", "caption", "eyebrow"] as const) {
      expect(designTokens.text[role]).toBeDefined();
      expect(typeof designTokens.text[role].color).toBe("string");
    }
  });

  it("bakes the emphasis ladder into each role (loud vs quiet decided once)", () => {
    // strong: bold + default ink
    expect(designTokens.text.section.fontWeight).toBe("800");
    expect(designTokens.text.section.color).toBe(designTokens.color.ink.primary);
    // default body: regular weight, default ink, 15px
    expect(designTokens.text.body.fontWeight).toBe("400");
    expect(designTokens.text.body.fontSize).toBe(15);
    // muted tier: small secondary/meta text uses the AA-safe gray (ink.secondary,
    // ~4.6:1), not the lighter ink.muted (~3.5:1) which fails AA at small sizes.
    expect(designTokens.text.label.color).toBe(designTokens.color.ink.secondary);
    expect(designTokens.text.caption.color).toBe(designTokens.color.ink.secondary);
  });

  it("keeps sectionTitle as a back-compat alias of section", () => {
    expect(designTokens.typography.sectionTitle).toMatchObject(designTokens.typography.section);
  });
});

describe("semantic color roles", () => {
  it("maps one meaning to one role", () => {
    expect(designTokens.role.action.primary).toBe(designTokens.color.ink.accent);
    expect(designTokens.role.action.danger).toBe(designTokens.color.ink.danger);
    expect(designTokens.role.text.muted).toBe(designTokens.color.ink.muted);
    expect(designTokens.role.surface.raised).toBe(designTokens.color.surface.primary);
  });
});
