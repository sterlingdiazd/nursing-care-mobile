import React from "react";
import renderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUseAuth,
  mockGetCareRequestById,
  mockGetActiveNurseProfiles,
  mockAssignCareRequestNurse,
  mockTransitionCareRequest,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGetCareRequestById: vi.fn(),
  mockGetActiveNurseProfiles: vi.fn(),
  mockAssignCareRequestNurse: vi.fn(),
  mockTransitionCareRequest: vi.fn(),
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
  useSegments: () => ["care-requests", "[id]"],
}));

vi.mock("@/src/context/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/src/services/careRequestService", () => ({
  getCareRequestById: mockGetCareRequestById,
  getActiveNurseProfiles: mockGetActiveNurseProfiles,
  assignCareRequestNurse: mockAssignCareRequestNurse,
  transitionCareRequest: mockTransitionCareRequest,
  downloadAndShareCareRequestReceipt: vi.fn(),
  reportPayment: vi.fn(),
}));

vi.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: vi.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: "Images" },
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
      { userId: "nurse-001", name: "Ana", lastName: "López", email: "ana@example.com", specialty: "General", category: "domicilio" },
      { userId: "nurse-999", name: "Zoila", lastName: "Pérez", email: "zoila@example.com", specialty: "Pediatría", category: "hogar" },
    ]);
    mockAssignCareRequestNurse.mockResolvedValue(makeCareRequest({ assignedNurse: "nurse-999" }));
    mockTransitionCareRequest.mockResolvedValue(makeCareRequest({ status: "Approved", approvedAtUtc: "2026-04-21T11:00:00Z" }));
  });

  it("uses the stable selector contract for the fixed detail route", async () => {
    const component = await renderScreen();

    expect(careRequestTestIds.detail.screen).toBe("care-detail-page");
    expect(careRequestTestIds.detail.statusChip).toBe("care-detail-status-chip");
    expect(component.root.findByProps({ testID: careRequestTestIds.detail.screen })).toBeTruthy();
    expect(component.root.findByProps({ testID: careRequestTestIds.detail.statusChip })).toBeTruthy();
    expect(component.root.findByProps({ testID: careRequestTestIds.detail.pricingBreakdownToggle })).toBeTruthy();
    expect(component.root.findByProps({ testID: careRequestTestIds.detail.assignmentSheetTrigger })).toBeTruthy();
  });

  it("opens the pricing breakdown in a sheet without the old review panel", async () => {
    const component = await renderScreen();

    expect(component.root.findAllByProps({ testID: careRequestTestIds.detail.pricingReviewPanel })).toHaveLength(0);
    expect(component.root.findAllByProps({ children: "Cerrar revisión de precios" })).toHaveLength(0);

    await act(async () => {
      component.root.findByProps({ testID: careRequestTestIds.detail.pricingBreakdownToggle }).props.onPress();
    });

    expect(component.root.findByProps({ testID: careRequestTestIds.detail.pricingSheet })).toBeTruthy();
    expect(component.root.findAllByProps({ testID: careRequestTestIds.detail.pricingReviewConfirmButton })).toHaveLength(0);
  });

  it("searches nurses vertically and assigns Zoila from the sheet", async () => {
    const component = await renderScreen();

    await act(async () => {
      component.root.findByProps({ testID: careRequestTestIds.detail.assignmentSheetTrigger }).props.onPress();
    });

    expect(component.root.findByProps({ testID: careRequestTestIds.detail.assignmentSheet })).toBeTruthy();

    await act(async () => {
      component.root.findByProps({ testID: careRequestTestIds.detail.assignmentSearchInput }).props.onChangeText("Zoila");
    });

    await act(async () => {
      component.root.findByProps({ testID: careRequestTestIds.detail.assignmentNurseOption("nurse-999") }).props.onPress();
    });

    await act(async () => {
      await component.root.findByProps({ testID: careRequestTestIds.detail.assignmentConfirmButton }).props.onPress();
    });

    expect(mockAssignCareRequestNurse).toHaveBeenCalledWith("care-001", { assignedNurse: "nurse-999" });
  });
});
