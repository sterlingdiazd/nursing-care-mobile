import {
  getAdminActionItems,
  getAdminDashboard,
  getAdminNotificationSummary,
  getAdminNotifications,
  markAdminNotificationAsRead,
} from "@/src/services/adminPortalService";
import { requestJson } from "@/src/services/httpClient";

vi.mock("@/src/services/httpClient", () => ({
  requestJson: vi.fn(),
}));

describe("adminPortalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga el panel administrativo", async () => {
    vi.mocked(requestJson).mockResolvedValue({ pendingNurseProfilesCount: 2 });
    await getAdminDashboard();
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/dashboard",
      method: "GET",
      auth: true,
    });
  });

  it("carga la cola administrativa con paginación", async () => {
    const envelope = { items: [], totalCount: 0, page: 1, pageSize: 10 };
    vi.mocked(requestJson).mockResolvedValue(envelope);
    const result = await getAdminActionItems({ page: 1, pageSize: 10 });
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/action-items?page=1&pageSize=10",
      method: "GET",
      auth: true,
    });
    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("carga notificaciones con filtros", async () => {
    vi.mocked(requestJson).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 10 });
    await getAdminNotifications({ status: "Unread", page: 2, pageSize: 10 });
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/notifications?status=Unread&page=2&pageSize=10",
      method: "GET",
      auth: true,
    });
  });

  it("actualiza el estado de lectura de notificaciones", async () => {
    vi.mocked(requestJson).mockResolvedValue(undefined);
    await markAdminNotificationAsRead("notif-1");
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/notifications/notif-1/read",
      method: "POST",
      auth: true,
    });
  });

  it("carga resumen de notificaciones", async () => {
    vi.mocked(requestJson).mockResolvedValue({ unread: 4 });
    await getAdminNotificationSummary();
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/notifications/summary",
      method: "GET",
      auth: true,
    });
  });
});
