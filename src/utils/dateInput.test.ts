import { describe, it, expect } from "vitest";
import { maskTyped, typedToIso } from "./dateInput";

describe("maskTyped", () => {
  it("strips non-digits so only numbers can enter (strict format control)", () => {
    expect(maskTyped("abc12def")).toBe("12");
    expect(maskTyped("1/2/3")).toBe("12-3");
  });

  it("progressively inserts dashes as digits are typed", () => {
    expect(maskTyped("0")).toBe("0");
    expect(maskTyped("01")).toBe("01");
    expect(maskTyped("015")).toBe("01-5");
    expect(maskTyped("0105")).toBe("01-05");
    expect(maskTyped("01052026")).toBe("01-05-2026");
  });

  it("caps at 8 digits (DDMMYYYY) and ignores overflow", () => {
    expect(maskTyped("010520261234")).toBe("01-05-2026");
  });

  it("drops the trailing dash cleanly on backspace", () => {
    // Re-masking the partial string a user is left with after deleting a digit.
    expect(maskTyped("01-0")).toBe("01-0");
    expect(maskTyped("01-")).toBe("01");
    expect(maskTyped("01")).toBe("01");
  });
});

describe("typedToIso", () => {
  it("converts a complete valid DD-MM-YYYY into ISO YYYY-MM-DD", () => {
    expect(typedToIso("09-05-2026")).toEqual({ iso: "2026-05-09", complete: true });
  });

  it("treats a partial entry as incomplete (no error yet)", () => {
    expect(typedToIso("09-05")).toEqual({ iso: null, complete: false });
    expect(typedToIso("")).toEqual({ iso: null, complete: false });
  });

  it("rejects an out-of-range month as complete-but-invalid", () => {
    expect(typedToIso("01-13-2026")).toEqual({ iso: null, complete: true });
    expect(typedToIso("01-00-2026")).toEqual({ iso: null, complete: true });
  });

  it("rejects a day beyond the real days-in-month (honors Feb/30-day months)", () => {
    expect(typedToIso("31-02-2026")).toEqual({ iso: null, complete: true });
    expect(typedToIso("31-04-2026")).toEqual({ iso: null, complete: true });
    // 2024 is a leap year, so Feb 29 is valid.
    expect(typedToIso("29-02-2024")).toEqual({ iso: "2024-02-29", complete: true });
    // 2026 is not, so Feb 29 is invalid.
    expect(typedToIso("29-02-2026")).toEqual({ iso: null, complete: true });
  });

  it("rejects implausible years outside [1900, 2100]", () => {
    expect(typedToIso("01-01-1899")).toEqual({ iso: null, complete: true });
    expect(typedToIso("01-01-2101")).toEqual({ iso: null, complete: true });
    expect(typedToIso("01-01-1900")).toEqual({ iso: "1900-01-01", complete: true });
  });
});
