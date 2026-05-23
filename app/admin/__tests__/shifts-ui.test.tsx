import { describe, expect, it, vi } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";

// The Shifts route now hosts the Calendario de Servicios, which pulls assignments
// from care-requests + the active-nurse roster. Mock just those two service calls.
vi.mock("@/src/services/adminPortalService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/services/adminPortalService")>()),
  getCareRequestsInRange: vi.fn().mockResolvedValue([]),
  getActiveNurseProfilesPaged: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 }),
}));

import AdminServiceCalendarScreen from "../shifts/index";

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

describe("AdminServiceCalendarScreen", () => {
  it("renders the calendar screen without crashing", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminServiceCalendarScreen />);
    });
    await flush();
    expect(component!.root.findByProps({ testID: "admin-calendar-screen" })).toBeTruthy();
  }, 15000);

  it("renders the month grid (day cells) and the view toggle", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminServiceCalendarScreen />);
    });
    await flush();
    const dayCells = component!.root.findAll(
      (n) => typeof n.props?.testID === "string" && n.props.testID.startsWith("calendar-day-"),
    );
    expect(dayCells.length).toBeGreaterThan(0); // 42-cell month grid
    expect(component!.root.findByProps({ testID: "admin-calendar-view-month" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-calendar-today" })).toBeTruthy();
  }, 15000);
});
