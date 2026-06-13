import { describe, expect, it } from "vitest";

import { designTokens } from "@/src/design-system/tokens";
import { formatUnitType, getStatusPillColors } from "@/src/utils/adminCareRequestBilling";

const P = designTokens.color.palette;

describe("getStatusPillColors", () => {
  it("maps each status to the canonical hue (soft bg + dark text)", () => {
    expect(getStatusPillColors("Approved")).toEqual({ bg: P.green.soft, fg: P.green.text });
    expect(getStatusPillColors("Rejected")).toEqual({ bg: P.red.soft, fg: P.red.text });
    expect(getStatusPillColors("Cancelled")).toEqual({ bg: P.red.soft, fg: P.red.text });
    expect(getStatusPillColors("Voided")).toEqual({ bg: P.red.soft, fg: P.red.text });
    expect(getStatusPillColors("Pending")).toEqual({ bg: P.amber.soft, fg: P.amber.text });
    expect(getStatusPillColors("PaymentReported")).toEqual({ bg: P.amber.soft, fg: P.amber.text });
    expect(getStatusPillColors("Completed")).toEqual({ bg: P.blue.soft, fg: P.blue.text });
    expect(getStatusPillColors("Invoiced")).toEqual({ bg: P.blue.soft, fg: P.blue.text });
    expect(getStatusPillColors("Paid")).toEqual({ bg: P.blue.soft, fg: P.blue.text });
  });

  it("falls back to neutral for an unknown status", () => {
    expect(getStatusPillColors("Whatever")).toEqual({ bg: P.neutral.soft, fg: P.neutral.text });
  });
});

describe("formatUnitType", () => {
  it("maps known catalog codes to accented Spanish labels", () => {
    expect(formatUnitType("dia_completo")).toBe("Día completo");
    expect(formatUnitType("medio_dia")).toBe("Medio día");
    expect(formatUnitType("mes")).toBe("Mes");
    expect(formatUnitType("sesion")).toBe("Sesión");
    expect(formatUnitType("hora")).toBe("Hora");
  });

  it("humanizes unknown snake_case codes (never leaks a raw code)", () => {
    expect(formatUnitType("turno_nocturno")).toBe("Turno nocturno");
    expect(formatUnitType("HORA")).toBe("Hora"); // case-insensitive match
  });

  it("returns empty string for null/empty", () => {
    expect(formatUnitType(null)).toBe("");
    expect(formatUnitType(undefined)).toBe("");
    expect(formatUnitType("")).toBe("");
  });
});
