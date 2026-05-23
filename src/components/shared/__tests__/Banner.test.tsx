import React from "react";
import { describe, it, expect } from "vitest";
import renderer, { act } from "react-test-renderer";

import { Banner } from "../Banner";

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let component!: renderer.ReactTestRenderer;
  act(() => {
    component = renderer.create(element);
  });
  return component;
}

describe("Banner", () => {
  it("renders nothing without a message", () => {
    expect(render(<Banner message={null} />).toJSON()).toBeNull();
    expect(render(<Banner message="" />).toJSON()).toBeNull();
  });

  it("renders the message when present", () => {
    const c = render(<Banner tone="error" message="Algo salió mal" />);
    const t = c.root.findAll((n) => typeof n.props?.children === "string").map((n) => n.props.children);
    expect(t).toContain("Algo salió mal");
  });
});
