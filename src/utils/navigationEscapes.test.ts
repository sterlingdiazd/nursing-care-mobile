import { describe, expect, it, vi } from "vitest";

import {
  buildAdminNurseProfileDetailPath,
  goBackOrReplace,
  mobileNavigationEscapes,
} from "./navigationEscapes";

describe("navigationEscapes", () => {
  it("defines the mobile fallback route map", () => {
    expect(mobileNavigationEscapes.createCareRequest).toBe("/care-requests");
    expect(mobileNavigationEscapes.forgotPassword).toBe("/login");
    expect(mobileNavigationEscapes.resetPassword).toBe("/forgot-password");
    expect(mobileNavigationEscapes.adminCareRequests).toBe("/admin/care-requests");
    expect(mobileNavigationEscapes.adminClients).toBe("/admin/clients");
    expect(mobileNavigationEscapes.adminNurseProfiles).toBe("/admin/nurse-profiles");
    expect(mobileNavigationEscapes.adminUsers).toBe("/admin/users");
  });

  it("builds the admin nurse detail fallback route", () => {
    expect(buildAdminNurseProfileDetailPath("nurse-123")).toBe("/admin/nurse-profiles/nurse-123");
  });

  it("goes back when navigation history exists", () => {
    const navigation = {
      back: vi.fn(),
      canGoBack: vi.fn(() => true),
      replace: vi.fn(),
    };

    const result = goBackOrReplace(navigation, "/care-requests");

    expect(result).toBe("back");
    expect(navigation.canGoBack).toHaveBeenCalled();
    expect(navigation.back).toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("replaces with the fallback route when history does not exist", () => {
    const navigation = {
      back: vi.fn(),
      canGoBack: vi.fn(() => false),
      replace: vi.fn(),
    };

    const result = goBackOrReplace(navigation, "/care-requests");

    expect(result).toBe("replace");
    expect(navigation.canGoBack).toHaveBeenCalled();
    expect(navigation.back).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith("/care-requests");
  });
});
