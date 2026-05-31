import React from "react";
import { describe, it, expect } from "vitest";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

import { SurfaceCard, SectionCard } from "../SurfaceCard";
import { designTokens } from "@/src/design-system/tokens";

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let component!: renderer.ReactTestRenderer;
  act(() => {
    component = renderer.create(element);
  });
  return component;
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return (style as Record<string, unknown>) ?? {};
}

describe("SurfaceCard", () => {
  it("renders children and propagates testID / nativeID onto the surface", () => {
    const c = render(
      <SurfaceCard testID="surface-x">
        <Text>contenido</Text>
      </SurfaceCard>,
    );
    // (RN test mock renders a composite + host node, so testID matches >1.)
    expect(c.root.findAll((n) => n.props?.testID === "surface-x").length).toBeGreaterThan(0);
    expect(c.root.findAll((n) => n.props?.nativeID === "surface-x").length).toBeGreaterThan(0);
    const texts = c.root.findAll((n) => typeof n.props?.children === "string").map((n) => n.props.children);
    expect(texts).toContain("contenido");
  });
});

describe("SectionCard", () => {
  it("renders eyebrow, title, body and footer", () => {
    const c = render(
      <SectionCard eyebrow="Editar" title="Empresa" footer={<Text>Guardar</Text>} testID="panel-x">
        <Text>Sol y Luna</Text>
      </SectionCard>,
    );
    const texts = c.root.findAll((n) => typeof n.props?.children === "string").map((n) => n.props.children);
    expect(texts).toEqual(expect.arrayContaining(["Editar", "Empresa", "Sol y Luna", "Guardar"]));
    expect(c.root.findAll((n) => n.props?.testID === "panel-x").length).toBeGreaterThan(0);
  });

  it("defaults the card-interior title to bodyStrong (15), below the shell title (22)", () => {
    const c = render(<SectionCard title="Detalle"><Text>x</Text></SectionCard>);
    const titleNode = c.root.find((n) => n.props?.children === "Detalle");
    expect(flattenStyle(titleNode.props.style).fontSize).toBe(designTokens.text.bodyStrong.fontSize);
    expect(designTokens.text.bodyStrong.fontSize).toBe(15);
  });

  it("can opt into the louder section (18) title for a prominent grouping", () => {
    const c = render(<SectionCard title="Grupo" titleRole="section"><Text>x</Text></SectionCard>);
    const titleNode = c.root.find((n) => n.props?.children === "Grupo");
    expect(flattenStyle(titleNode.props.style).fontSize).toBe(designTokens.text.section.fontSize);
    expect(designTokens.text.section.fontSize).toBe(18);
  });
});
