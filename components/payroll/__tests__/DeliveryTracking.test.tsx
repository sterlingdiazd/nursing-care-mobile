import { describe, it, expect, vi } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { PeriodDetail } from "../PeriodDetail";

vi.mock("@/src/components/shared/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: any) => children,
}));

const basePeriod = {
  id: "p1",
  startDate: "2026-05-01",
  endDate: "2026-05-15",
  cutoffDate: "2026-05-13",
  paymentDate: "2026-05-15",
  status: "Closed",
  createdAtUtc: "2026-05-01T00:00:00Z",
  closedAtUtc: "2026-05-16T00:00:00Z",
  lines: [],
  staffSummary: [
    {
      nurseUserId: "nurse-sent",
      nurseDisplayName: "Nurse Sent",
      lineCount: 1,
      grossCompensation: 1000,
      transportIncentives: 0,
      adjustmentsTotal: 0,
      deductionsTotal: 0,
      netCompensation: 1000,
      paymentConfirmedAtUtc: "2026-05-16T10:00:00Z",
      deliveryStatus: "Sent",
      deliveryChannel: "Email",
    },
    {
      nurseUserId: "nurse-failed",
      nurseDisplayName: "Nurse Failed",
      lineCount: 1,
      grossCompensation: 1000,
      transportIncentives: 0,
      adjustmentsTotal: 0,
      deductionsTotal: 0,
      netCompensation: 1000,
      paymentConfirmedAtUtc: "2026-05-16T11:00:00Z",
      deliveryStatus: "Failed",
      deliveryChannel: "WhatsApp",
    },
    {
      nurseUserId: "nurse-pending",
      nurseDisplayName: "Nurse Pending",
      lineCount: 1,
      grossCompensation: 1000,
      transportIncentives: 0,
      adjustmentsTotal: 0,
      deductionsTotal: 0,
      netCompensation: 1000,
      paymentConfirmedAtUtc: null,
      deliveryStatus: null,
    }
  ],
  canModify: false,
};

describe("PeriodDetail Delivery Tracking", () => {
  it("shows delivery status badges for confirmed payments", () => {
    let component!: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <PeriodDetail
          period={basePeriod as any}
          onClose={async () => {}}
          onBack={() => {}}
          onSetActions={() => {}}
        />,
      );
    });

    const sentBadge = component.root.findByProps({ testID: "delivery-status-nurse-sent" });
    const failedBadge = component.root.findByProps({ testID: "delivery-status-nurse-failed" });
    
    expect(sentBadge).toBeTruthy();
    expect(failedBadge).toBeTruthy();
    
    // Check for "Transferencia confirmada" button state
    const sentButton = component.root.findByProps({ testID: "admin-staff-confirm-transfer-nurse-sent" });
    expect(sentButton.props.accessibilityState.disabled).toBe(true);
    
    const pendingButton = component.root.findByProps({ testID: "admin-staff-confirm-transfer-nurse-pending" });
    expect(pendingButton.props.accessibilityState.disabled).toBe(false);
  });
});
