import React from "react";
import renderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

// setupTests.ts mocks AuthContext globally (a useAuth stub) for screen tests.
// This suite exercises the REAL provider, so undo that mock for this file.
vi.unmock("@/src/context/AuthContext");

// --- Mocks for the session store and side-effecting services ----------------
const clearAuthSession = vi.fn().mockResolvedValue(undefined);
const loadAuthSession = vi.fn().mockResolvedValue(null);
const saveAuthSession = vi.fn().mockResolvedValue(undefined);
const subscribeToAuthSession = vi.fn().mockReturnValue(() => {});
const resolveUserIdFromToken = vi.fn().mockReturnValue("user-1");

vi.mock("@/src/services/authSession", () => ({
  clearAuthSession: (...args: unknown[]) => clearAuthSession(...args),
  loadAuthSession: (...args: unknown[]) => loadAuthSession(...args),
  saveAuthSession: (...args: unknown[]) => saveAuthSession(...args),
  subscribeToAuthSession: (...args: unknown[]) => subscribeToAuthSession(...args),
  resolveUserIdFromToken: (...args: unknown[]) => resolveUserIdFromToken(...args),
}));

// The push-token deactivation HANGS forever. This is the crux of the regression:
// if logout() ever awaits this network call before clearing the session, the
// `await logout()` below would never resolve and the test would time out.
const deactivateTokenOnLogout = vi.fn((..._args: unknown[]) => new Promise<void>(() => {}));
vi.mock("@/src/services/pushNotificationsService", () => ({
  deactivateTokenOnLogout: (...args: unknown[]) => deactivateTokenOnLogout(...args),
}));

vi.mock("@/src/services/authService", () => ({
  login: vi.fn(),
  registerUser: vi.fn(),
  completeProfile: vi.fn(),
}));
vi.mock("@/src/utils/haptics", () => ({
  hapticFeedback: { success: vi.fn(), error: vi.fn(), selection: vi.fn(), light: vi.fn() },
}));
vi.mock("@/src/logging/clientLogger", () => ({ logClientEvent: vi.fn() }));

import { AuthProvider, useAuth } from "../AuthContext";

let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return null;
}

const seedSession = {
  token: "jwt-token",
  refreshToken: "",
  expiresAtUtc: null,
  userId: "user-1",
  email: "admin@example.com",
  roles: ["ADMIN"],
  requiresProfileCompletion: false,
  requiresAdminReview: false,
};

describe("AuthContext.logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAuthSession.mockResolvedValue(null);
  });

  it("clears the session immediately even when push-token deactivation hangs forever", async () => {
    await act(async () => {
      renderer.create(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
    });

    // Arrange: an authenticated session.
    await act(async () => {
      auth.setSession({ ...seedSession });
    });
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.token).toBe("jwt-token");

    // Act: logout. If this awaited the hanging deactivation, act() would never resolve.
    await act(async () => {
      await auth.logout();
    });

    // Assert: session is gone and storage was cleared — without blocking on the network.
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.token).toBeNull();
    expect(auth.userId).toBeNull();
    expect(auth.roles).toEqual([]);
    expect(clearAuthSession).toHaveBeenCalledTimes(1);
  });
});
