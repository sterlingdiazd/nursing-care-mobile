import { describe, it, expect } from "vitest";
import { formatDOP, formatDOPCompact } from "../currency";

describe("formatDOP", () => {
  it("formats with RD$ prefix, 2 decimals and es-DO grouping", () => {
    expect(formatDOP(1234.5)).toBe("RD$ 1,234.50");
    expect(formatDOP(0)).toBe("RD$ 0.00");
    expect(formatDOP(70710)).toBe("RD$ 70,710.00");
  });

  it("tolerates null, undefined and NaN (no crash)", () => {
    expect(formatDOP(null)).toBe("RD$ 0.00");
    expect(formatDOP(undefined)).toBe("RD$ 0.00");
    expect(formatDOP(NaN)).toBe("RD$ 0.00");
  });
});

describe("formatDOPCompact", () => {
  it("uses K/M above thresholds and full format below", () => {
    expect(formatDOPCompact(284500)).toBe("RD$ 284.5K");
    expect(formatDOPCompact(1_200_000)).toBe("RD$ 1.2M");
    expect(formatDOPCompact(500)).toBe("RD$ 500.00");
  });

  it("tolerates null/undefined", () => {
    expect(formatDOPCompact(null)).toBe("RD$ 0.00");
  });
});
