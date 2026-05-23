import React from "react";
import { describe, it, expect, vi } from "vitest";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

import { ListRow } from "../ListRow";

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

describe("ListRow", () => {
  it("renders title, subtitle and non-falsy meta lines", () => {
    const c = render(
      <ListRow title="María" subtitle="Enfermera" metaLines={["Cédula 001", null, false, "Activa"]} />,
    );
    const t = texts(c);
    expect(t).toContain("María");
    expect(t).toContain("Enfermera");
    expect(t).toContain("Cédula 001");
    expect(t).toContain("Activa");
  });

  it("fires onPress and shows a chevron when pressable", () => {
    const onPress = vi.fn();
    const c = render(<ListRow title="Cliente" onPress={onPress} accessibilityLabel="Ver cliente" />);
    expect(texts(c)).toContain("›");
    const row = c.root.findAll((n) => n.props?.accessibilityLabel === "Ver cliente")[0];
    act(() => row.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders a custom right accessory instead of the chevron", () => {
    const c = render(
      <ListRow title="Pago" onPress={() => {}} rightAccessory={<Text>RD$1,000</Text>} />,
    );
    const t = texts(c);
    expect(t).toContain("RD$1,000");
    expect(t).not.toContain("›");
  });
});
