import {
  getDisplayErrorMessage,
  getNetworkErrorMessage,
} from "@/src/services/httpClient";

describe("httpClient helpers", () => {
  it("prefers problem details detail text when present", () => {
    const message = getDisplayErrorMessage(
      JSON.stringify({
        title: "Login failed",
        detail: "Invalid email or password.",
      }),
      401,
    );

    expect(message).toBe("Invalid email or password.");
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
    expect(message).toContain("trusts the local certificate");
  });
});
