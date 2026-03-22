import { describe, expect, it } from "vitest";

import { formatRoleLabels } from "@/src/utils/roleLabels";

describe("formatRoleLabels", () => {
  it("maps backend roles to Spanish labels", () => {
    expect(formatRoleLabels(["Admin", "Client", "Nurse"])).toBe(
      "Administracion, Cliente, Enfermeria",
    );
  });

  it("uses the provided empty-state label", () => {
    expect(formatRoleLabels([], "Usuario")).toBe("Usuario");
  });
});
