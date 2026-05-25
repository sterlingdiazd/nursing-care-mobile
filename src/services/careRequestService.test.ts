import {
  assignCareRequestNurse,
  downloadAndShareCareRequestReceipt,
  getActiveNurseProfiles,
} from "@/src/services/careRequestService";
import { requestJson } from "@/src/services/httpClient";
import * as authSession from "@/src/services/authSession";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

vi.mock("@/src/config/api", () => ({
  API_BASE_URL: "https://api.example.test",
}));

vi.mock("@/src/services/httpClient", () => ({
  requestJson: vi.fn(),
}));

vi.mock("@/src/services/authSession", () => ({
  getCachedAuthSession: vi.fn(),
  loadAuthSession: vi.fn(),
}));

vi.mock("expo-file-system", () => {
  class MockFile {
    uri: string;
    constructor(...parts: any[]) {
      this.uri = parts.map((part) => part?.uri ?? part).join("/");
    }
    static downloadFileAsync = vi.fn(async () => new MockFile("file:///cache/recibo.pdf"));
  }
  return {
    File: MockFile,
    Paths: { cache: { uri: "file:///cache" } },
  };
});

vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async () => undefined),
}));

describe("careRequestService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active nurse profiles from the admin endpoint and unwraps the envelope", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      items: [
        {
          userId: "nurse-1",
          email: "nurse@example.com",
          name: "Luisa",
          lastName: "Martinez",
          specialty: "Atencion domiciliaria",
          category: "Senior",
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 100,
    });

    const result = await getActiveNurseProfiles();
    await expect(Promise.resolve(result)).resolves.toHaveLength(1);
    expect(requestJson).toHaveBeenCalledWith({
      path: "/api/admin/nurse-profiles/active?page=1&pageSize=100",
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

  it("downloads and shares a receipt with the current Expo File API", async () => {
    vi.mocked(authSession.getCachedAuthSession).mockReturnValue({
      token: "access-token",
      refreshToken: "refresh-token",
      expiresAtUtc: null,
      userId: "client-1",
      email: "client@example.com",
      roles: ["CLIENT"],
      profileType: 2,
      requiresProfileCompletion: false,
      requiresAdminReview: false,
    });

    const uri = await downloadAndShareCareRequestReceipt("care-1");

    expect(File.downloadFileAsync).toHaveBeenCalledWith(
      "https://api.example.test/api/care-requests/care-1/receipt",
      expect.objectContaining({ uri: expect.stringContaining("recibo-solicitud-care-1.pdf") }),
      expect.objectContaining({
        idempotent: true,
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          Accept: "application/pdf",
        }),
      }),
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/recibo.pdf", expect.objectContaining({
      mimeType: "application/pdf",
    }));
    expect(Paths.cache).toBeTruthy();
    expect(uri).toBe("file:///cache/recibo.pdf");
  });
});
