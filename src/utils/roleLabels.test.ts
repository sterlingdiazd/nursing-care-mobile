import { describe, expect, it } from "vitest";

import { formatRoleLabels } from "@/src/utils/roleLabels";

describe("roleLabels", () => {
  it("maps backend roles to Spanish labels", () => {
    expect(formatRoleLabels(["ADMIN", "CLIENT", "NURSE"])).toBe(
      "Administracion, Cliente, Enfermeria",
    );
  });

  it("uses the provided empty-state label", () => {
    expect(formatRoleLabels([], "Usuario")).toBe("Usuario");
  });
});
