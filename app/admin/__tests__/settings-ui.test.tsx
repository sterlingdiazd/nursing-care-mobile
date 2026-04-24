import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";
import AdminSettingsScreen from "../settings";

describe("AdminSettingsScreen", () => {
  const flushEffects = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing initially", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminSettingsScreen />);
    });
    await flushEffects();
    expect(component!.root).toBeTruthy();
  });

  it("renders screen testID", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminSettingsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-settings-screen" })).toBeTruthy();
  });

  it("renders refresh button", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminSettingsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-settings-refresh-btn" })).toBeTruthy();
  });

  it("renders settings list container", async () => {
    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminSettingsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-settings-list" })).toBeTruthy();
  });

  it("renders error banner when API fails", async () => {
    const { listAdminSettings } = await import("@/src/services/adminShiftsService");
    vi.mocked(listAdminSettings).mockRejectedValueOnce(new Error("Error de red"));

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminSettingsScreen />);
    });
    await flushEffects();
    expect(component!.root.findByProps({ testID: "admin-settings-error" })).toBeTruthy();
  });

  it("renders setting card and edit panel for a setting", async () => {
    const { listAdminSettings } = await import("@/src/services/adminShiftsService");
    vi.mocked(listAdminSettings).mockResolvedValueOnce([
      {
        key: "MAX_CONCURRENT",
        value: "5",
        category: "Operacional",
        valueType: "Integer",
        description: null,
        allowedValuesJson: null,
        modifiedAtUtc: null,
        modifiedByActorName: null,
      },
    ]);

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminSettingsScreen />);
    });
    await flushEffects();

    const card = component!.root.findByProps({ testID: "admin-setting-card-MAX_CONCURRENT" });
    expect(card).toBeTruthy();

    act(() => { card.props.onPress(); });

    expect(component!.root.findByProps({ testID: "admin-setting-edit-panel" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-setting-save-btn" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-setting-cancel-btn" })).toBeTruthy();
  });
});
