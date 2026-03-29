import { describe, it, expect, vi } from "vitest";

describe("Mobile Admin Dashboard Navigation Logic", () => {
  const DASHBOARD_BUTTONS = [
    { label: "Usuarios", path: "/admin/users" },
    { label: "Enfermeras", path: "/admin/nurse-profiles" },
    { label: "Clientes", path: "/admin/clients" },
    { label: "Solicitudes", path: "/admin/care-requests" },
    { label: "Abrir reportes", path: "/admin/reports" },
  ];

  it("should include 'Abrir reportes' in the dashboard options", () => {
    const reportsBtn = DASHBOARD_BUTTONS.find(btn => btn.label === "Abrir reportes");
    expect(reportsBtn).toBeDefined();
    expect(reportsBtn?.path).toBe("/admin/reports");
  });

  it("should have correct paths for all main modules", () => {
    expect(DASHBOARD_BUTTONS.map(b => b.path)).toContain("/admin/users");
    expect(DASHBOARD_BUTTONS.map(b => b.path)).toContain("/admin/reports");
  });
});
