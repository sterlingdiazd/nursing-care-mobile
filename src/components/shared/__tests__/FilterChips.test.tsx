import React from "react";
import { describe, it, expect, vi } from "vitest";
import renderer, { act } from "react-test-renderer";

import { FilterChips } from "../FilterChips";

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let component!: renderer.ReactTestRenderer;
  act(() => {
    component = renderer.create(element);
  });
  return component;
}

const OPTIONS = [
  { key: "active", label: "Activas", count: 3 },
  { key: "all", label: "Todas" },
] as const;

describe("FilterChips", () => {
  it("marks the selected chip and renders count badges", () => {
    const c = render(<FilterChips options={OPTIONS} value="active" onChange={() => {}} />);
    const selected = c.root.findAll((n) => n.props?.accessibilityState?.selected === true);
    // Composite Pressable + host node both carry the prop, so de-dupe by label.
    const selectedLabels = new Set(selected.map((n) => n.props.accessibilityLabel));
    expect(selectedLabels).toEqual(new Set(["Filtro Activas"]));
    const texts = c.root
      .findAll((n) => ["string", "number"].includes(typeof n.props?.children))
      .map((n) => n.props.children);
    expect(texts).toContain("Activas");
    expect(texts).toContain(3); // count badge
  });

  it("emits the chip key on press", () => {
    const onChange = vi.fn();
    const c = render(<FilterChips options={OPTIONS} value="active" onChange={onChange} />);
    const todas = c.root.findAll((n) => n.props?.accessibilityLabel === "Filtro Todas")[0];
    act(() => todas.props.onPress());
    expect(onChange).toHaveBeenCalledWith("all");
  });
});
