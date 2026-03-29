import {
  clearClientLogs,
  getClientLogsSnapshot,
  logClientEvent,
  sanitizeData,
} from "@/src/logging/clientLogger";

describe("clientLogger", () => {
  beforeEach(() => {
    clearClientLogs();
  });

  it("redacts password and token-like values", () => {
    const sanitized = sanitizeData({
      password: "Secret123!",
      nested: {
        token: "abc",
        authorization: "Bearer abc",
      },
    });

    expect(sanitized).toEqual({
      password: "[REDACTED]",
      nested: {
        token: "[REDACTED]",
        authorization: "[REDACTED]",
      },
    });
  });

  it("stores a correlation id on each log entry", () => {
    logClientEvent("mobile.test", "Testing correlation ids", {
      detail: "hello",
    });

    const logs = getClientLogsSnapshot();

    expect(logs).toHaveLength(1);
    expect(logs[0].correlationId).toBeTruthy();
    expect(logs[0].data).toMatchObject({
      correlationId: logs[0].correlationId,
      detail: "hello",
    });
  });

  it("reuses an existing correlation id when one is supplied", () => {
    logClientEvent("mobile.test", "Uses provided correlation id", {
      correlationId: "server-correlation-id",
      detail: "kept",
    });

    const [entry] = getClientLogsSnapshot();

    expect(entry.correlationId).toBe("server-correlation-id");
  });
});
