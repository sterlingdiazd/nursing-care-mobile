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
    await markAllClientNotificationsRead();

    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/client/notifications",
      method: "GET",
      auth: true,
    });
    expect(requestVoid).toHaveBeenCalledWith({
      path: "/api/client/notifications/note-1/read",
      method: "PUT",
      auth: true,
    });
    expect(requestVoid).toHaveBeenCalledWith({
      path: "/api/client/notifications/read-all",
      method: "PUT",
      auth: true,
    });
  });
});
