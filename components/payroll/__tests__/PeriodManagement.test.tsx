import { describe, it, expect, vi } from "vitest";
import React from "react";
import { Text } from "react-native";
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

function collectRenderedText(component: renderer.ReactTestRenderer): string {
  const values: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      values.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
    }
  };

  component.root.findAllByType(Text).forEach((node) => visit(node.props.children));
  return values.join(" ");
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

  it("renders service detail cards without raw request identifiers", () => {
    const rawRequestId = "9bf894d4-522f-4680-8399-690c86137e37";
    let component!: renderer.ReactTestRenderer;

    act(() => {
      component = renderer.create(
        <PeriodDetail
          period={{
            ...basePeriod,
            status: "Closed",
            closedAtUtc: "2026-05-16T00:00:00Z",
            canModify: false,
            staffSummary: [
              {
                nurseUserId: "nurse-1",
                nurseDisplayName: "Agustina Nurse",
                lineCount: 1,
                grossCompensation: 1375,
                transportIncentives: 0,
                adjustmentsTotal: 0,
                deductionsTotal: 0,
                netCompensation: 1375,
              },
            ],
            lines: [
              {
                id: "line-1",
                nurseUserId: "nurse-1",
                nurseDisplayName: "Agustina Nurse",
                serviceExecutionId: "service-1",
                description: `Servicio hogar_basico · solicitud ${rawRequestId}`,
                baseCompensation: 1375,
                transportIncentive: 0,
                complexityBonus: 0,
                medicalSuppliesCompensation: 0,
                adjustmentsTotal: 0,
                deductionsTotal: 0,
                netCompensation: 1375,
                serviceSubtotal: 2200,
                createdAtUtc: "2026-05-15T00:00:00Z",
                pendingOverrideId: null,
              },
            ],
          } as any}
          onClose={async () => {}}
          onBack={() => {}}
          onPrepareRecalculate={() => {}}
          onSetActions={() => {}}
        />,
      );
    });

    const text = collectRenderedText(component);
    expect(text).toContain("Hogar básico");
    expect(text).toContain("Cobrado");
    expect(text).toContain("Margen");
    expect(text).not.toContain(rawRequestId);
  });
});
