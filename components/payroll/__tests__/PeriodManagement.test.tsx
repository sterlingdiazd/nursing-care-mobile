import { describe, it, expect, vi } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";
import type { FooterAction } from "@/src/components/navigation/AppFooter";

vi.mock("@/src/components/shared/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: any) => children,
}));

import { PeriodDetail } from "../PeriodDetail";

const basePeriod = {
  id: "p1",
  startDate: "2026-05-01",
  endDate: "2026-05-15",
  cutoffDate: "2026-05-13",
  paymentDate: "2026-05-15",
  status: "Open",
  createdAtUtc: "2026-05-01T00:00:00Z",
  closedAtUtc: null,
  lines: [] as any[],
  staffSummary: [] as any[],
  canModify: true,
};

// Capture the footer actions PeriodDetail emits for a given period so we can assert
// the "manage a period created by error" gating: edit/delete are offered only while
// the period is Open and has no calculated lines.
function captureActions(period: any): FooterAction[] {
  let captured: FooterAction[] = [];
  act(() => {
    renderer.create(
      <PeriodDetail
        period={period as any}
        onClose={async () => {}}
        onBack={() => {}}
        onPrepareRecalculate={() => {}}
        onSetActions={(a) => { captured = a; }}
        onEdit={() => {}}
        onDelete={async () => {}}
      />,
    );
  });
  return captured;
}

describe("PeriodDetail management actions", () => {
  it("offers edit and delete for an Open period with no calculated lines", () => {
    const ids = captureActions(basePeriod).map((a) => a.testID);
    expect(ids).toContain("admin-period-edit-button");
    expect(ids).toContain("admin-period-delete-button");
  });

  it("hides edit and delete for a closed period", () => {
    const ids = captureActions({ ...basePeriod, status: "Closed", canModify: false }).map((a) => a.testID);
    expect(ids).not.toContain("admin-period-edit-button");
    expect(ids).not.toContain("admin-period-delete-button");
  });

  it("hides edit and delete when the period has activity (canModify=false)", () => {
    const ids = captureActions({ ...basePeriod, canModify: false }).map((a) => a.testID);
    expect(ids).not.toContain("admin-period-edit-button");
    expect(ids).not.toContain("admin-period-delete-button");
  });
});
