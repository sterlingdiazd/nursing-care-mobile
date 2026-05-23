import React from "react";
import { describe, it, expect, vi } from "vitest";
import renderer, { act } from "react-test-renderer";

import { MonthGrid } from "../MonthGrid";
import type { CalendarDay } from "@/src/hooks/useServiceCalendar";

const pad = (n: number) => String(n).padStart(2, "0");
// Unique consecutive ISO dates starting Apr 27 2026 (mimics a real 42-cell grid).
const isoAt = (i: number) => {
  const d = new Date(2026, 3, 27, 12, 0, 0);
  d.setDate(d.getDate() + i);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function makeDays(): CalendarDay[] {
  return Array.from({ length: 42 }, (_, i) => ({
    iso: isoAt(i),
    inMonth: i >= 4 && i < 35,
    isToday: i === 5,
    categories: i === 10 ? ["hogar", "domicilio"] : i % 4 === 0 ? ["hogar"] : [],
    count: i === 10 ? 3 : 0,
    hasUnassigned: i === 10,
  }));
}

describe("MonthGrid", () => {
  it("renders 42 unique day cells and fires onSelectDay", () => {
    const onSelectDay = vi.fn();
    const targetIso = isoAt(10);
    let component!: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <MonthGrid days={makeDays()} selectedDay={isoAt(5)} onSelectDay={onSelectDay} />,
      );
    });
    const cells = component.root.findAll(
      (n) => typeof n.props?.testID === "string" && n.props.testID.startsWith("calendar-day-"),
    );
    expect(new Set(cells.map((c) => c.props.testID)).size).toBe(42);

    const target = component.root.find(
      (n) => n.props?.testID === `calendar-day-${targetIso}` && typeof n.props?.onPress === "function",
    );
    act(() => target.props.onPress());
    expect(onSelectDay).toHaveBeenCalledWith(targetIso);
  });
});
