import {
  getDisplayErrorMessage,
  getNetworkErrorMessage,
  requestJson,
} from "@/src/services/httpClient";
import * as authSession from "@/src/services/authSession";
import * as clientLogger from "@/src/logging/clientLogger";

vi.mock("@/src/config/api", () => ({
  API_BASE_URL: "https://api.example.test",
}));

vi.mock("@/src/logging/clientLogger", () => ({
  createCorrelationId: vi.fn(() => "correlation-id"),
  logClientEvent: vi.fn(),
}));

vi.mock("@/src/services/authSession", () => ({
  getCachedAuthSession: vi.fn(),
  loadAuthSession: vi.fn(),
  saveAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
}));

describe("httpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers problem details detail text when present", () => {
    const message = getDisplayErrorMessage(
      JSON.stringify({
        title: "Inicio de sesion fallido",
        detail: "Correo o contrasena invalidos.",
      }),
      401,
    );

    expect(message).toBe("Correo o contrasena invalidos.");
  });

  it("falls back to the first validation error when detail is missing", () => {
    const message = getDisplayErrorMessage(
      JSON.stringify({
        title: "La solicitud contiene datos invalidos.",
        errors: {
          identificationNumber: ["La cedula debe tener exactamente 11 digitos."],
        },
      }),
      400,
    );

    expect(message).toBe("La cedula debe tener exactamente 11 digitos.");
  });

  it("falls back to the raw response text when the payload is not json", () => {
    expect(getDisplayErrorMessage("Plain backend failure", 500)).toBe("Plain backend failure");
  });

  it("builds a device-focused network error message", () => {
    const message = getNetworkErrorMessage(
      "https://10.0.0.33:5050/api/health",
      new Error("Network request failed"),
    );

    expect(message).toContain("https://10.0.0.33:5050/api/health");
    expect(message).toContain("Network request failed");
    expect(message).toContain("confia en el certificado local");
  });

  it("retries an authenticated request after refreshing the access token", async () => {
    vi.mocked(authSession.getCachedAuthSession).mockReturnValue({
      token: "expired-token",
      refreshToken: "refresh-token",
      expiresAtUtc: null,
      userId: "11111111-1111-1111-1111-111111111111",
      email: "care@example.com",
      roles: ["ADMIN"],
      profileType: 1,
      requiresProfileCompletion: false,
      requiresAdminReview: false,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: "Expired token." }),
        headers: { get: () => "correlation-id" },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            token: "fresh-token",
            refreshToken: "fresh-refresh-token",
            expiresAtUtc: "2026-03-18T19:00:00Z",
            userId: "11111111-1111-1111-1111-111111111111",
            email: "care@example.com",
            roles: ["ADMIN"],
            requiresProfileCompletion: false,
            requiresAdminReview: false,
          }),
        headers: { get: () => "correlation-id" },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
        headers: { get: () => "correlation-id" },
      });

    vi.stubGlobal("fetch", fetchMock);

    const response = await requestJson<{ ok: boolean }>({
      path: "/api/care-requests",
      method: "GET",
      auth: true,
    });

    expect(response).toEqual({ ok: true });
    expect(authSession.saveAuthSession).toHaveBeenCalledWith({
      token: "fresh-token",
      refreshToken: "fresh-refresh-token",
      expiresAtUtc: "2026-03-18T19:00:00Z",
      userId: "11111111-1111-1111-1111-111111111111",
      email: "care@example.com",
      roles: ["ADMIN"],
      profileType: 1,
      requiresProfileCompletion: false,
      requiresAdminReview: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer fresh-token",
    });
  });

  it("clears session when refresh token is unavailable during a 401", async () => {
    vi.mocked(authSession.getCachedAuthSession).mockReturnValue({
      token: "expired-token",
      refreshToken: "",
      expiresAtUtc: null,
      userId: "11111111-1111-1111-1111-111111111111",
      email: "care@example.com",
      roles: ["ADMIN"],
      profileType: 1,
      requiresProfileCompletion: false,
      requiresAdminReview: false,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ detail: "Expired token." }),
      headers: { get: () => "correlation-id" },
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestJson({
        path: "/api/care-requests",
        method: "GET",
        auth: true,
      }),
    ).rejects.toThrow("Expired token.");

    expect(authSession.clearAuthSession).toHaveBeenCalled();
    expect(clientLogger.logClientEvent).toHaveBeenCalled();
  });
});
