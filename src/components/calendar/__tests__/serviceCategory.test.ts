import { describe, it, expect } from "vitest";
import { categoryOf, CATEGORY_META } from "../serviceCategory";

describe("categoryOf", () => {
  it("maps hogar_* types to hogar", () => {
    expect(categoryOf("hogar_diario")).toBe("hogar");
    expect(categoryOf("hogar_premium")).toBe("hogar");
  });

  it("maps domicilio_* types to domicilio", () => {
    expect(categoryOf("domicilio_24h")).toBe("domicilio");
    expect(categoryOf("domicilio_noche_12h")).toBe("domicilio");
  });

  it("maps medicos / unknown types to otros", () => {
    expect(categoryOf("suero")).toBe("otros");
    expect(categoryOf("medicamentos")).toBe("otros");
    expect(categoryOf("sonda_foley")).toBe("otros");
  });

  it("exposes a distinct color + label per category", () => {
    const colors = new Set([CATEGORY_META.hogar.color, CATEGORY_META.domicilio.color, CATEGORY_META.otros.color]);
    expect(colors.size).toBe(3);
    expect(CATEGORY_META.hogar.label).toBe("Hogar");
    expect(CATEGORY_META.domicilio.label).toBe("Domicilio");
  });
});
