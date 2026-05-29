import { getClientProfile, updateClientProfile } from "@/src/services/clientProfileService";
import {
  getClientNotifications,
  markAllClientNotificationsRead,
  markClientNotificationRead,
} from "@/src/services/clientNotificationsService";
import { requestJson, requestVoid } from "@/src/services/httpClient";

vi.mock("@/src/services/httpClient", () => ({
  requestJson: vi.fn(),
  requestVoid: vi.fn(),
}));

describe("client mobile services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the client profile endpoints", async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({
      name: "Ana",
      lastName: "Lopez",
      identificationNumber: "00112345678",
      phone: "8095550101",
    });

    await getClientProfile();

    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/client/profile",
      method: "GET",
      auth: true,
    });

    await updateClientProfile({
      name: "Ana",
      lastName: "Lopez",
      identificationNumber: "00112345678",
      phone: "8095550101",
    });

    expect(requestJson).toHaveBeenLastCalledWith({
      path: "/api/client/profile",
      method: "PUT",
      auth: true,
      body: {
        name: "Ana",
        lastName: "Lopez",
        identificationNumber: "00112345678",
        phone: "8095550101",
      },
    });
  });

  it("uses the client notification endpoints", async () => {
    vi.mocked(requestJson).mockResolvedValueOnce([]);

    await getClientNotifications();
    await markClientNotificationRead("note-1");
    await markAllClientNotificationsRead(["note-2", "note-3"]);

    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/client/notifications?status=Active&pageSize=50",
      method: "GET",
      auth: true,
    });
    expect(requestVoid).toHaveBeenCalledWith({
      path: "/api/client/notifications/note-1/read",
      method: "POST",
      auth: true,
    });
    expect(requestVoid).toHaveBeenCalledWith({
      path: "/api/client/notifications/note-2/read",
      method: "POST",
      auth: true,
    });
    expect(requestVoid).toHaveBeenCalledWith({
      path: "/api/client/notifications/note-3/read",
      method: "POST",
      auth: true,
    });
  });

  it("normalizes paged client notification responses", async () => {
    const notification = {
      id: "note-1",
      category: "care_request_approved",
      severity: "Medium",
      title: "Solicitud aprobada",
      body: "Tu solicitud fue aprobada.",
      entityType: "CareRequest",
      entityId: "request-1",
      createdAtUtc: "2026-05-26T12:00:00Z",
      readAtUtc: null,
    };

    vi.mocked(requestJson).mockResolvedValueOnce({
      items: [notification],
      totalCount: 1,
      page: 1,
      pageSize: 50,
    });

    await expect(getClientNotifications()).resolves.toEqual([notification]);

    vi.mocked(requestJson).mockResolvedValueOnce({
      data: {
        items: [notification],
      },
    });

    await expect(getClientNotifications()).resolves.toEqual([notification]);
  });
});
