import { describe, it, expect } from "vitest";
import { buildServiceTypeNameMap, labelForServiceType } from "./serviceTypeLabel";

const options = {
  careRequestCategories: [{ code: "domicilio", displayName: "Domicilio" }],
  careRequestTypes: [
    { code: "domicilio_dia_12h", displayName: "Domicilio día (12h)" },
    { code: "hogar_diario", displayName: "Hogar diario" },
  ],
};

describe("buildServiceTypeNameMap", () => {
  it("folds categories and types into one code->name map", () => {
    const map = buildServiceTypeNameMap(options);
    expect(map["domicilio"]).toBe("Domicilio");
    expect(map["domicilio_dia_12h"]).toBe("Domicilio día (12h)");
    expect(map["hogar_diario"]).toBe("Hogar diario");
  });

  it("returns an empty map for null/undefined options", () => {
    expect(buildServiceTypeNameMap(null)).toEqual({});
    expect(buildServiceTypeNameMap(undefined)).toEqual({});
  });
});

describe("labelForServiceType", () => {
  const map = buildServiceTypeNameMap(options);

  it("returns the friendly name for a known code", () => {
    expect(labelForServiceType(map, "domicilio_dia_12h")).toBe("Domicilio día (12h)");
  });

  it("falls back to the raw code when unknown (never blanks out)", () => {
    expect(labelForServiceType(map, "tipo_desconocido")).toBe("tipo_desconocido");
  });

  it("returns empty string for null/undefined code", () => {
    expect(labelForServiceType(map, null)).toBe("");
    expect(labelForServiceType(map, undefined)).toBe("");
  });
});
