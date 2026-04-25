type BackCapableRouter<TPath> = {
  back: () => void;
  canGoBack: () => boolean;
  replace: (fallbackPath: TPath) => void;
};

export const mobileNavigationEscapes = {
  createCareRequest: "/care-requests" as const,
  forgotPassword: "/login" as const,
  resetPassword: "/forgot-password" as const,
  adminCareRequests: "/admin/care-requests" as const,
  adminClients: "/admin/clients" as const,
  adminNurseProfiles: "/admin/nurse-profiles" as const,
  adminUsers: "/admin/users" as const,
} as const;

export function buildAdminNurseProfileDetailPath(id: string) {
  return `/admin/nurse-profiles/${id}` as const;
}

export function goBackOrReplace<TPath>(navigation: BackCapableRouter<TPath>, fallbackPath: TPath) {
  if (navigation.canGoBack()) {
    navigation.back();
    return "back" as const;
  }

  navigation.replace(fallbackPath);
  return "replace" as const;
}
