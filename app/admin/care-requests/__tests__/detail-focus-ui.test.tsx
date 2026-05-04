import React from "react";
import { Text, View } from "react-native";
import renderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminCareRequestDetailDto } from "@/src/services/adminPortalService";

const {
  focusCallbacks,
  mockGetAdminCareRequestDetail,
  mockUseAuth,
} = vi.hoisted(() => ({
  focusCallbacks: [] as Array<() => void>,
  mockGetAdminCareRequestDetail: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    React.useEffect(() => {
      focusCallbacks.push(callback);
      callback();
    }, [callback]);
  },
}));

vi.mock("expo-router", () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  useLocalSearchParams: () => ({ id: "care-001" }),
}));

vi.mock("@/src/context/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/src/services/adminPortalService", () => ({
  getAdminCareRequestDetail: mockGetAdminCareRequestDetail,
}));

vi.mock("@/src/services/careRequestService", () => ({
  verifyCareRequestPricing: vi.fn(),
}));

vi.mock("@/components/app/MobileWorkspaceShell", () => ({
  default: ({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) => (
    <View>
      {actions}
      {children}
    </View>
  ),
}));

vi.mock("@/src/components/shared/WorkflowActionBar", () => ({
  default: () => <View />,
}));

vi.mock("@/src/components/shared/CollapsibleSection", () => ({
  CollapsibleSection: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
}));

vi.mock("@/src/utils/navigationEscapes", () => ({
  goBackOrReplace: vi.fn(),
  mobileNavigationEscapes: {
    adminCareRequests: "/admin/care-requests",
  },
}));

import AdminCareRequestDetailScreen from "../[id]";

function makeAdminDetail(status: AdminCareRequestDetailDto["status"]): AdminCareRequestDetailDto {
  return {
    id: "care-001",
    clientUserId: "client-001",
    clientDisplayName: "María García",
    clientEmail: "maria@example.com",
    clientIdentificationNumber: "00112345678",
    assignedNurseUserId: "nurse-001",
    assignedNurseDisplayName: "Ana López",
    assignedNurseEmail: "ana@example.com",
    careRequestDescription: "Cuidado domiciliario",
    careRequestType: "domicilio",
    unit: 4,
    unitType: "horas",
    price: 1000,
    total: 4000,
    distanceFactor: null,
    complexityLevel: null,
    clientBasePrice: 1000,
    medicalSuppliesCost: 0,
    careRequestDate: "2026-05-04T10:00:00Z",
    suggestedNurse: null,
    status,
    createdAtUtc: "2026-05-04T10:00:00Z",
    updatedAtUtc: "2026-05-04T10:00:00Z",
    approvedAtUtc: null,
    rejectedAtUtc: null,
    completedAtUtc: null,
    invoicedAtUtc: undefined,
    paidAtUtc: undefined,
    voidedAtUtc: undefined,
    receiptGeneratedAtUtc: undefined,
    invoiceNumber: undefined,
    bankReference: undefined,
    voidReason: undefined,
    receiptNumber: undefined,
    isOverdueOrStale: false,
    pricingBreakdown: {
      category: "General",
      basePrice: 1000,
      categoryFactor: 1,
      distanceFactor: null,
      distanceFactorValue: 1,
      complexityLevel: null,
      complexityFactorValue: 1,
      volumeDiscountPercent: 0,
      lineBeforeVolumeDiscount: null,
      unitPriceAfterVolumeDiscount: null,
      subtotalBeforeSupplies: 4000,
      medicalSuppliesCost: 0,
      total: 4000,
    },
    timeline: [],
  };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("AdminCareRequestDetailScreen focus refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    focusCallbacks.length = 0;
    mockUseAuth.mockReturnValue({
      isReady: true,
      isAuthenticated: true,
      requiresProfileCompletion: false,
      roles: ["ADMIN"],
    });
    mockGetAdminCareRequestDetail
      .mockResolvedValueOnce(makeAdminDetail("Completed"))
      .mockResolvedValueOnce(makeAdminDetail("Invoiced"));
  });

  it("reloads the detail when the route regains focus", async () => {
    let component!: renderer.ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<AdminCareRequestDetailScreen />);
    });
    await flushPromises();

    expect(mockGetAdminCareRequestDetail).toHaveBeenCalledTimes(1);
    expect(component.root.findByProps({ testID: "care-request-status-badge" }).props.children).toBe("Completado");

    await act(async () => {
      focusCallbacks.at(-1)?.();
    });
    await flushPromises();

    expect(mockGetAdminCareRequestDetail).toHaveBeenCalledTimes(2);
    expect(component.root.findByProps({ testID: "care-request-status-badge" }).props.children).toBe("Facturada");
  });
});
