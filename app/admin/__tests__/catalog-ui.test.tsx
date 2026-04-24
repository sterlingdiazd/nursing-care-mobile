import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";
import AdminCatalogScreen from "../catalog";

describe("AdminCatalogScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAllCatalogServices = async () => {
    const svc = await import("@/src/services/adminPortalService");
    vi.mocked(svc.listCareRequestCategories).mockResolvedValue([]);
    vi.mocked(svc.listCareRequestTypes).mockResolvedValue([]);
    vi.mocked(svc.listUnitTypes).mockResolvedValue([]);
    vi.mocked(svc.listDistanceFactors).mockResolvedValue([]);
    vi.mocked(svc.listComplexityLevels).mockResolvedValue([]);
    vi.mocked(svc.listVolumeDiscountRules).mockResolvedValue([]);
    vi.mocked(svc.listNurseSpecialties).mockResolvedValue([]);
    vi.mocked(svc.listNurseCategories).mockResolvedValue([]);
  };

  it("renders without crashing initially", async () => {
    await mockAllCatalogServices();
    expect(() => renderer.create(<AdminCatalogScreen />)).not.toThrow();
  });

  it("renders screen testID after loading", async () => {
    await mockAllCatalogServices();

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminCatalogScreen />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(component!.root.findByProps({ testID: "admin-catalog-screen" })).toBeTruthy();
  });

  it("renders tab bar after loading", async () => {
    await mockAllCatalogServices();

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminCatalogScreen />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(component!.root.findByProps({ testID: "admin-catalog-tab-bar" })).toBeTruthy();
  });

  it("renders control buttons after loading", async () => {
    await mockAllCatalogServices();

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminCatalogScreen />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(component!.root.findByProps({ testID: "admin-catalog-toggle-inactive" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-catalog-refresh-btn" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-catalog-create-btn" })).toBeTruthy();
  });

  it("renders cards list container after loading", async () => {
    await mockAllCatalogServices();

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminCatalogScreen />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(component!.root.findByProps({ testID: "admin-catalog-cards-list" })).toBeTruthy();
  });

  it("renders edit panel when create button pressed", async () => {
    await mockAllCatalogServices();

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminCatalogScreen />);
    });
    await act(async () => { await Promise.resolve(); });

    const createBtn = component!.root.findByProps({ testID: "admin-catalog-create-btn" });
    await act(async () => { createBtn.props.onPress(); });

    expect(component!.root.findByProps({ testID: "admin-catalog-edit-panel" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-catalog-save-btn" })).toBeTruthy();
    expect(component!.root.findByProps({ testID: "admin-catalog-cancel-btn" })).toBeTruthy();
  });

  it("renders error banner when API fails", async () => {
    const svc = await import("@/src/services/adminPortalService");
    vi.mocked(svc.listCareRequestCategories).mockRejectedValue(new Error("Error de red"));
    vi.mocked(svc.listCareRequestTypes).mockResolvedValue([]);
    vi.mocked(svc.listUnitTypes).mockResolvedValue([]);
    vi.mocked(svc.listDistanceFactors).mockResolvedValue([]);
    vi.mocked(svc.listComplexityLevels).mockResolvedValue([]);
    vi.mocked(svc.listVolumeDiscountRules).mockResolvedValue([]);
    vi.mocked(svc.listNurseSpecialties).mockResolvedValue([]);
    vi.mocked(svc.listNurseCategories).mockResolvedValue([]);

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminCatalogScreen />);
    });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(component!.root.findByProps({ testID: "admin-catalog-error" })).toBeTruthy();
  });

  it("renders catalog cards when data is loaded", async () => {
    const svc = await import("@/src/services/adminPortalService");
    vi.mocked(svc.listCareRequestCategories).mockResolvedValue([
      { id: "cat-001", code: "STANDARD", displayName: "Estandar", categoryFactor: 1.0, isActive: true, displayOrder: 0 },
    ]);
    vi.mocked(svc.listCareRequestTypes).mockResolvedValue([]);
    vi.mocked(svc.listUnitTypes).mockResolvedValue([]);
    vi.mocked(svc.listDistanceFactors).mockResolvedValue([]);
    vi.mocked(svc.listComplexityLevels).mockResolvedValue([]);
    vi.mocked(svc.listVolumeDiscountRules).mockResolvedValue([]);
    vi.mocked(svc.listNurseSpecialties).mockResolvedValue([]);
    vi.mocked(svc.listNurseCategories).mockResolvedValue([]);

    let component: ReturnType<typeof renderer.create>;
    await act(async () => {
      component = renderer.create(<AdminCatalogScreen />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(component!.root.findByProps({ testID: "admin-catalog-card-cat-001" })).toBeTruthy();
  });
});
