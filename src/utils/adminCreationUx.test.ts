import { describe, expect, it } from "vitest";

import {
  getAdminCareCreateProgress,
  getAdminNurseCreateProgress,
  getAdminNurseReviewProgress,
} from "@/src/utils/adminCreationUx";

describe("getAdminCareCreateProgress", () => {
  it("marks the request as review-ready when the core fields are complete", () => {
    const progress = getAdminCareCreateProgress({
      clientUserId: "client-1",
      careRequestDescription: "Apoyo post operatorio",
      careRequestType: "Cuidado Basico",
      unit: 2,
      careRequestDate: "2026-04-23",
      suggestedNurse: "",
    });

    expect(progress.coreReady).toBe(true);
    expect(progress.status.label).toBe("Lista para revisar");
  });

  it("lists the missing core fields when the request is incomplete", () => {
    const progress = getAdminCareCreateProgress({
      clientUserId: "",
      careRequestDescription: "",
      careRequestType: "Cuidado Basico",
      unit: 0,
      careRequestDate: "",
    });

    expect(progress.coreReady).toBe(false);
    expect(progress.missingCoreLabels).toEqual(["Cliente", "Fecha", "Unidades", "Descripcion"]);
  });
});

describe("getAdminNurseReviewProgress", () => {
  it("marks the nurse review as ready when all operational fields are present", () => {
    const progress = getAdminNurseReviewProgress({
      name: "Maria",
      lastName: "Gonzalez",
      identificationNumber: "00112345678",
      phone: "8095550101",
      email: "maria@example.com",
      hireDate: "2026-04-10",
      specialty: "Pediatria",
      licenseId: "LIC-001",
      bankName: "Banco Popular",
      accountNumber: "123456",
      category: "Especialista",
    });

    expect(progress.ready).toBe(true);
    expect(progress.status.label).toBe("Lista para activar");
  });

  it("tracks the remaining review requirements", () => {
    const progress = getAdminNurseReviewProgress({
      name: "Maria",
      lastName: "Gonzalez",
      identificationNumber: "00112345678",
      phone: "8095550101",
      email: "maria@example.com",
      hireDate: "2026-04-10",
      specialty: "",
      licenseId: "",
      bankName: "Banco Popular",
      accountNumber: "",
      category: "",
    });

    expect(progress.ready).toBe(false);
    expect(progress.missingLabels).toEqual(["Especialidad", "Licencia", "Cuenta", "Categoria"]);
  });
});

describe("getAdminNurseCreateProgress", () => {
  it("marks the nurse creation flow as ready when all required fields are valid", () => {
    const progress = getAdminNurseCreateProgress({
      name: "Maria",
      lastName: "Gonzalez",
      identificationNumber: "00112345678",
      phone: "8095550101",
      email: "maria@example.com",
      password: "password123",
      confirmPassword: "password123",
      hireDate: "2026-04-10",
      specialty: "Pediatria",
      licenseId: "LIC-001",
      bankName: "",
      accountNumber: "",
      category: "Especialista",
      isOperationallyActive: true,
    });

    expect(progress.ready).toBe(true);
    expect(progress.status.label).toBe("Registro listo");
  });

  it("reports invalid identity and credential fields", () => {
    const progress = getAdminNurseCreateProgress({
      name: "",
      lastName: "",
      identificationNumber: "",
      phone: "",
      email: "correo-invalido",
      password: "short",
      confirmPassword: "different",
      hireDate: "",
      specialty: "",
      licenseId: "",
      bankName: "",
      accountNumber: "",
      category: "",
      isOperationallyActive: true,
    });

    expect(progress.ready).toBe(false);
    expect(progress.missingLabels).toContain("Nombre");
    expect(progress.missingLabels).toContain("Contrasena");
    expect(progress.missingLabels).toContain("Categoria");
  });
});
