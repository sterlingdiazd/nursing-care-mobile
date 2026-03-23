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

  it("carga la cola administrativa", async () => {
    vi.mocked(requestJson).mockResolvedValue([]);
    await getAdminActionItems();
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/action-items",
      method: "GET",
      auth: true,
    });
  });

  it("carga notificaciones con filtros", async () => {
    vi.mocked(requestJson).mockResolvedValue([]);
    await getAdminNotifications({ unreadOnly: true, includeArchived: true });
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/notifications?includeArchived=true&unreadOnly=true",
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
