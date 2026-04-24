import { describe, expect, it, vi } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";

vi.mock("@/src/services/adminShiftsService", () => ({
  listAdminShifts: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  getAdminShiftDetail: vi.fn().mockResolvedValue({}),
  getAdminShiftChanges: vi.fn().mockResolvedValue([]),
  listAdminSettings: vi.fn().mockResolvedValue([]),
  updateAdminSetting: vi.fn().mockResolvedValue({}),
}));

import AdminShiftsScreen from "../shifts/index";

describe("AdminShiftsScreen", () => {
  const flushEffects = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  it("renders without crashing initially", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminShiftsScreen />);
    });
    await flushEffects();
    expect(component!.root).toBeTruthy();
  }, 15000);

  it("renders screen testID", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminShiftsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-shifts-screen" })).toBeTruthy();
  }, 15000);

  it("renders filter toggle and refresh buttons", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminShiftsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-shifts-filter-toggle" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-shifts-refresh-btn" })).toBeTruthy();
  }, 15000);

  it("renders shifts list container", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminShiftsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-shifts-list" })).toBeTruthy();
  }, 15000);

  it("shows filter inputs when filter toggle pressed", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminShiftsScreen />);
    });
    await flushEffects();

    const toggle = component!.root.findByProps({ testID: "admin-shifts-filter-toggle" });
    act(() => { toggle.props.onPress(); });

    expect(component!.root.findByProps({ testID: "admin-shifts-start-date-input" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-shifts-end-date-input" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-shifts-search-btn" })).toBeTruthy();
  }, 15000);

  it("renders error banner when API fails", async () => {
    const { listAdminShifts } = await import("@/src/services/adminShiftsService");
    vi.mocked(listAdminShifts).mockRejectedValueOnce(new Error("Error de red"));

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminShiftsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-shifts-error" })).toBeTruthy();
  }, 15000);

  it("renders shift cards when data is loaded", async () => {
    const { listAdminShifts } = await import("@/src/services/adminShiftsService");
    vi.mocked(listAdminShifts).mockResolvedValueOnce({
      items: [
        {
          id: "shift-001",
          nurseUserId: "nurse-001",
          nurseDisplayName: "Ana Garcia",
          careRequestId: "care-001",
          careRequestReference: "CR-001",
          scheduledStartUtc: "2026-04-20T08:00:00Z",
          scheduledEndUtc: "2026-04-20T16:00:00Z",
          status: "Planned" as const,
          createdAtUtc: "2026-04-19T12:00:00Z",
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
    });

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminShiftsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-shift-card-shift-001" })).toBeTruthy();
  }, 15000);
});
