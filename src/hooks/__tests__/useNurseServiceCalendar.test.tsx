import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import renderer, { act } from "react-test-renderer";

// Mock the nurse range endpoint the hook fetches from.
const getNurseCareRequestsInRange = vi.fn();
vi.mock("@/src/services/careRequestService", () => ({
  getNurseCareRequestsInRange: (...args: unknown[]) => getNurseCareRequestsInRange(...args),
}));

import { useNurseServiceCalendar, type UseNurseServiceCalendarResult } from "../useNurseServiceCalendar";

// Host component captures the latest hook result for assertions.
let result: UseNurseServiceCalendarResult | undefined;
function Host({ enabled }: { enabled: boolean }) {
  result = useNurseServiceCalendar(enabled);
  return null;
}
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  result = undefined;
});

describe("useNurseServiceCalendar — money mapping (nurse pay, never client total)", () => {
  it("maps the assignment amount from nurseExpectedPay, not the client total", async () => {
    getNurseCareRequestsInRange.mockResolvedValue([
      {
        id: "cr-1",
        careRequestDate: "2026-06-22",
        careRequestType: "hogar",
        careRequestDescription: "Cuidado diario en el hogar",
        status: "Completed",
        assignedNurse: "nurse-1",
        assignedNurseDisplayName: "Ángela Severino",
        nurseExpectedPay: 6294.59, // her pay — what she must see
        total: 12500, // client price — the nurse must NEVER see this
      },
    ]);

    await act(async () => {
      renderer.create(<Host enabled />);
      await flush();
    });

    const day = result?.assignmentsByDate["2026-06-22"];
    expect(day).toHaveLength(1);
    expect(day![0].total).toBe(6294.59); // nurse pay, not 12500
    expect(day![0].total).not.toBe(12500); // client total never leaks in
  });

  it("falls back to 0 when nurse pay is absent — it never substitutes the client total", async () => {
    getNurseCareRequestsInRange.mockResolvedValue([
      {
        id: "cr-2",
        careRequestDate: "2026-06-23",
        careRequestType: "hogar",
        careRequestDescription: "Servicio",
        status: "Completed",
        assignedNurse: "nurse-1",
        nurseExpectedPay: null,
        total: 9999, // present, but must not be shown to the nurse
      },
    ]);

    await act(async () => {
      renderer.create(<Host enabled />);
      await flush();
    });

    const day = result?.assignmentsByDate["2026-06-23"];
    expect(day![0].total).toBe(0);
    expect(day![0].total).not.toBe(9999);
  });
});
