import React from "react";
import { describe, it, expect } from "vitest";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

import { FormPanel } from "../FormPanel";

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let component!: renderer.ReactTestRenderer;
  act(() => {
    component = renderer.create(element);
  });
  return component;
}

describe("FormPanel", () => {
  it("renders eyebrow, title, children and footer", () => {
    const c = render(
      <FormPanel eyebrow="Editar" title="Nombre de la empresa" footer={<Text>Guardar</Text>}>
        <Text>Sol y Luna</Text>
      </FormPanel>,
    );
    const t = c.root.findAll((n) => typeof n.props?.children === "string").map((n) => n.props.children);
    expect(t).toContain("Editar");
    expect(t).toContain("Nombre de la empresa");
    expect(t).toContain("Sol y Luna");
    expect(t).toContain("Guardar");
  });
});
