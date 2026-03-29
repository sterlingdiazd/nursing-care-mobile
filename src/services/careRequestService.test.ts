import {
  assignCareRequestNurse,
  getActiveNurseProfiles,
} from "@/src/services/careRequestService";
import { requestJson } from "@/src/services/httpClient";

vi.mock("@/src/services/httpClient", () => ({
  requestJson: vi.fn(),
}));

describe("careRequestService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active nurse profiles from the admin endpoint", async () => {
    vi.mocked(requestJson).mockResolvedValue([
      {
        userId: "nurse-1",
        email: "nurse@example.com",
        name: "Luisa",
        lastName: "Martinez",
        specialty: "Atencion domiciliaria",
        category: "Senior",
      },
    ]);

    await expect(getActiveNurseProfiles()).resolves.toHaveLength(1);
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/nurse-profiles/active",
      method: "GET",
      auth: true,
    });
  });

  it("assigns a nurse through the admin assignment endpoint", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      id: "request-1",
      userID: "client-1",
      careRequestDescription: "Solicitud",
      assignedNurse: "nurse-1",
      status: "Pending",
      createdAtUtc: "2026-03-21T10:00:00Z",
      updatedAtUtc: "2026-03-21T10:10:00Z",
      approvedAtUtc: null,
      rejectedAtUtc: null,
      completedAtUtc: null,
    });

    await assignCareRequestNurse("request-1", { assignedNurse: "nurse-1" });

    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/care-requests/request-1/assignment",
      method: "PUT",
      body: { assignedNurse: "nurse-1" },
      auth: true,
    });
  });
});
