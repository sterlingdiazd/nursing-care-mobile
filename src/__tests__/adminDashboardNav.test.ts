import { describe, expect, it } from "vitest";

describe("Mobile Admin menu navigation logic", () => {
  const MENU_GROUPS = [
    {
      title: "Personas",
      items: [
        { label: "Usuarios", path: "/admin/users" },
        { label: "Clientes", path: "/admin/clients" },
        { label: "Enfermeras", path: "/admin/nurse-profiles" },
      ],
    },
    {
      title: "Servicios",
      items: [
        { label: "Solicitudes", path: "/admin/care-requests" },
        { label: "Turnos", path: "/admin/shifts" },
        { label: "Acciones", path: "/admin/action-items" },
      ],
    },
    {
      title: "Operación",
      items: [
        { label: "Nómina", path: "/admin/payroll" },
        { label: "Reportes", path: "/admin/reports" },
        { label: "Auditoría", path: "/admin/audit-logs" },
      ],
    },
    {
      title: "Sistema",
      items: [
        { label: "Catálogo", path: "/admin/catalog" },
        { label: "Ajustes", path: "/admin/settings" },
        { label: "Notificaciones", path: "/admin/notifications" },
      ],
    },
  ];

  const allItems = MENU_GROUPS.flatMap((group) => group.items);

  it("moves reports into the conventional admin menu", () => {
    const reportsBtn = allItems.find((btn) => btn.label === "Reportes");
    expect(reportsBtn).toBeDefined();
    expect(reportsBtn?.path).toBe("/admin/reports");
  });

  it("keeps all main modules reachable from Menú", () => {
    expect(allItems.map((item) => item.path)).toEqual(
      expect.arrayContaining([
        "/admin/users",
        "/admin/clients",
        "/admin/nurse-profiles",
        "/admin/care-requests",
        "/admin/payroll",
        "/admin/reports",
        "/admin/settings",
      ]),
    );
  });
});
