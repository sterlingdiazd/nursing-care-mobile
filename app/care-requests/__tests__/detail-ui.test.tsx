import React from "react";
import renderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUseAuth,
  mockGetCareRequestById,
  mockGetActiveNurseProfiles,
  mockAssignCareRequestNurse,
  mockTransitionCareRequest,
  mockVerifyCareRequestPricing,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGetCareRequestById: vi.fn(),
  mockGetActiveNurseProfiles: vi.fn(),
  mockAssignCareRequestNurse: vi.fn(),
  mockTransitionCareRequest: vi.fn(),
  mockVerifyCareRequestPricing: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: {
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  },
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
  useLocalSearchParams: () => ({ id: "care-001" }),
}));

vi.mock("@/src/context/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/src/services/careRequestService", () => ({
  getCareRequestById: mockGetCareRequestById,
  getActiveNurseProfiles: mockGetActiveNurseProfiles,
  assignCareRequestNurse: mockAssignCareRequestNurse,
  transitionCareRequest: mockTransitionCareRequest,
  verifyCareRequestPricing: mockVerifyCareRequestPricing,
}));

import CareRequestDetailScreen from "../[id]";
import { careRequestTestIds } from "@/src/testing/testIds";

function makeCareRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "care-001",
    userID: "client-001",
    assignedNurse: "nurse-001",
    suggestedNurse: "Ana López",
    careRequestDescription: "Monitoreo postoperatorio en casa",
    careRequestDate: "2026-04-30",
    createdAtUtc: "2026-04-20T10:00:00Z",
    updatedAtUtc: "2026-04-21T11:00:00Z",
    approvedAtUtc: null,
    rejectedAtUtc: null,
    rejectionReason: null,
    completedAtUtc: null,
    cancelledAtUtc: null,
    status: "Pending",
    careRequestType: "domicilio",
    price: 1200,
    total: 2400,
    categoryFactorSnapshot: 1.2,
    distanceFactorMultiplierSnapshot: 1.1,
    complexityMultiplierSnapshot: 1.05,
    clientBasePrice: 1200,
    lineBeforeVolumeDiscount: 2520,
    volumeDiscountPercentSnapshot: 5,
    unitPriceAfterVolumeDiscount: 2394,
    subtotalBeforeSupplies: 2394,
    medicalSuppliesCost: 6,
    pricingCategoryCode: "POST_OP",
    ...overrides,
  };
}

async function renderScreen() {
  let component!: renderer.ReactTestRenderer;
  await act(async () => {
    component = renderer.create(<CareRequestDetailScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return component;
}

describe("CareRequestDetailScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      roles: ["ADMIN"],
      userId: "admin-001",
    });
    mockGetCareRequestById.mockResolvedValue(makeCareRequest());
    mockGetActiveNurseProfiles.mockResolvedValue([
      { userId: "nurse-001", name: "Ana", lastName: "López", email: "ana@example.com" },
    ]);
    mockAssignCareRequestNurse.mockResolvedValue(makeCareRequest({ assignedNurse: "nurse-001" }));
    mockTransitionCareRequest.mockResolvedValue(makeCareRequest({ status: "Approved", approvedAtUtc: "2026-04-21T11:00:00Z" }));
    mockVerifyCareRequestPricing.mockResolvedValue({
      matches: true,
      discrepancies: [],
      limitationNotes: ["No se detectaron diferencias activas."],
    });
  });

  it("uses the stable selector contract for the client detail route", async () => {
    const component = await renderScreen();

    expect(careRequestTestIds.detail.screen).toBe("care-detail-page");
    expect(careRequestTestIds.detail.statusChip).toBe("care-detail-status-chip");
    expect(careRequestTestIds.detail.primaryAction).toBe("price-breakdown-verify-button");
    expect(component.root.findByProps({ testID: careRequestTestIds.detail.screen })).toBeTruthy();
    expect(component.root.findByProps({ testID: careRequestTestIds.detail.statusChip })).toBeTruthy();
    // The primary action button uses the pricingBreakdownToggle testID on the component
    expect(component.root.findByProps({ testID: careRequestTestIds.detail.pricingBreakdownToggle })).toBeTruthy();
  });

  it("opens the in-route pricing review panel and runs verification from there", async () => {
    const component = await renderScreen();

    expect(component.root.findAllByProps({ testID: careRequestTestIds.detail.pricingReviewPanel })).toHaveLength(0);

    await act(async () => {
      component.root.findByProps({ testID: careRequestTestIds.detail.pricingBreakdownToggle }).props.onPress();
    });

    expect(component.root.findByProps({ testID: careRequestTestIds.detail.pricingReviewPanel })).toBeTruthy();

    await act(async () => {
      await component.root.findByProps({ testID: careRequestTestIds.detail.pricingReviewConfirmButton }).props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockVerifyCareRequestPricing).toHaveBeenCalledWith("care-001");
    expect(component.root.findByProps({ testID: "price-verification-success" })).toBeTruthy();
  });

  it("keeps the deep pricing breakdown collapsed until the review path is opened", async () => {
    const component = await renderScreen();

    expect(component.root.findAllByProps({ testID: "care-detail-pricing-breakdown" })).toHaveLength(0);

    await act(async () => {
      component.root.findByProps({ testID: careRequestTestIds.detail.pricingBreakdownToggle }).props.onPress();
    });

    expect(component.root.findByProps({ testID: "care-detail-pricing-breakdown" })).toBeTruthy();
  });
});
