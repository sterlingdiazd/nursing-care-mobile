import React from "react";
import { describe, it, expect, vi } from "vitest";
import renderer, { act } from "react-test-renderer";

import { Pagination } from "../Pagination";

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let component!: renderer.ReactTestRenderer;
  act(() => {
    component = renderer.create(element);
  });
  return component;
}

function pageLabels(component: renderer.ReactTestRenderer): string[] {
  return component.root
    .findAll((n) => typeof n.props?.accessibilityLabel === "string" && /^Página \d+$/.test(n.props.accessibilityLabel))
    .map((n) => n.props.accessibilityLabel as string);
}

describe("Pagination", () => {
  it("renders nothing when there is a single page", () => {
    const component = render(<Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />);
    expect(component.toJSON()).toBeNull();
  });

  it("collapses interior pages to ellipsis for long ranges", () => {
    const component = render(<Pagination currentPage={1} totalPages={16} onPageChange={() => {}} />);
    const labels = pageLabels(component);
    // Number chips render once each (Pressable + host node), so de-dupe.
    const uniquePages = new Set(labels);
    expect(uniquePages.size).toBeLessThan(16);
    expect(uniquePages).toContain("Página 16");
    expect(uniquePages).toContain("Página 1");
  });

  it("invokes onPageChange clamped to the valid range", () => {
    const onPageChange = vi.fn();
    const component = render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);

    const prev = component.root.findAll((n) => n.props?.accessibilityLabel === "Página anterior")[0];
    act(() => {
      prev.props.onPress();
    });
    // Already on page 1 — clamps, never emits 0 or negative.
    expect(onPageChange).toHaveBeenCalledWith(1);

    const page3 = component.root.findAll((n) => n.props?.accessibilityLabel === "Página 3")[0];
    act(() => {
      page3.props.onPress();
    });
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
