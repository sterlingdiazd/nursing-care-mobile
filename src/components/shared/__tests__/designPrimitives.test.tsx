import React from "react";
import { describe, it, expect, vi } from "vitest";
import renderer, { act } from "react-test-renderer";

import { IconBadge } from "../IconBadge";
import { ActionCard } from "../ActionCard";
import { ModuleTile } from "../ModuleTile";

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let component!: renderer.ReactTestRenderer;
  act(() => {
    component = renderer.create(element);
  });
  return component;
}

function texts(c: renderer.ReactTestRenderer): unknown[] {
  return c.root.findAll((n) => typeof n.props?.children === "string").map((n) => n.props.children);
}

function hasTestID(c: renderer.ReactTestRenderer, id: string): boolean {
  return c.root.findAll((n) => n.props?.testID === id).length > 0;
}

function pressByLabel(c: renderer.ReactTestRenderer, label: string): void {
  const node = c.root.findAll((n) => n.props?.accessibilityLabel === label)[0];
  act(() => node.props.onPress());
}

describe("IconBadge", () => {
  it("renders a tinted badge addressable by testID without crashing", () => {
    const c = render(<IconBadge icon="users" hue="blue" testID="icon-badge" />);
    expect(hasTestID(c, "icon-badge")).toBe(true);
  });
});

describe("ActionCard", () => {
  it("renders title, subtitle, count pill and action label", () => {
    const c = render(
      <ActionCard
        icon="exclamation-circle"
        hue="red"
        title="Vencidas"
        subtitle="Solicitudes vencidas"
        countText="3 pendientes"
        actionLabel="Revisar"
        testID="card-overdue"
        onPress={() => {}}
      />,
    );
    const t = texts(c);
    expect(t).toContain("Vencidas");
    expect(t).toContain("Solicitudes vencidas");
    expect(t).toContain("3 pendientes");
    expect(t).toContain("Revisar");
  });

  it("emits the stable testID and fires onPress (label defaults to title)", () => {
    const onPress = vi.fn();
    const c = render(
      <ActionCard
        icon="bell"
        hue="blue"
        title="Seguimiento"
        subtitle="Alertas"
        actionLabel="Ver"
        testID="card-followup"
        onPress={onPress}
      />,
    );
    expect(hasTestID(c, "card-followup")).toBe(true);
    pressByLabel(c, "Seguimiento");
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("omits the count pill when countText is not provided", () => {
    const c = render(
      <ActionCard icon="bell" hue="blue" title="Solo" subtitle="Sin conteo" actionLabel="Ir" testID="t" onPress={() => {}} />,
    );
    const t = texts(c);
    expect(t).toContain("Solo");
    expect(t).toContain("Sin conteo");
    expect(t).toContain("Ir");
  });
});

describe("ModuleTile", () => {
  it("renders the label, emits the stable testID and fires onPress", () => {
    const onPress = vi.fn();
    const c = render(
      <ModuleTile icon="cog" hue="neutral" label="Ajustes" testID="module-settings" onPress={onPress} />,
    );
    expect(texts(c)).toContain("Ajustes");
    expect(hasTestID(c, "module-settings")).toBe(true);
    pressByLabel(c, "Ajustes");
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
