import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { registerForPushAsync } from "@/src/services/pushNotificationsService";
import { resolveAdminOperationalDeepLink } from "@/src/utils/adminOperationalUx";

/**
 * Mounted once from the root layout. Responsibilities:
 *   1. Register the device's Expo push token whenever the user is authenticated
 *      (login or cold start). Idempotent on the backend.
 *   2. Wire the tap-to-deep-link handler. Tapping a notification (foreground,
 *      background, or cold start) opens the app to the `data.deepLinkPath`
 *      that the backend embedded in the push payload.
 */
export function usePushNotifications() {
  const { isReady, isAuthenticated, userId } = useAuth();
  const registeredForUserRef = useRef<string | null>(null);
  const handledColdStartRef = useRef(false);

  // Register the token after auth is ready and we know the user.
  useEffect(() => {
    if (!isReady || !isAuthenticated || !userId) return;
    if (registeredForUserRef.current === userId) return;
    registeredForUserRef.current = userId;
    void registerForPushAsync().catch(() => {
      // Permission denied or device limitation — non-fatal. The user can still
      // use the in-app inbox; they just won't get OS push.
    });
  }, [isReady, isAuthenticated, userId]);

  // Handle taps on notifications while the app is open or backgrounded.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
      const deepLinkPath = typeof data.deepLinkPath === "string" ? data.deepLinkPath : null;
      if (deepLinkPath) {
        try {
          router.push(resolveAdminOperationalDeepLink(deepLinkPath) as never);
        } catch {
          // Path no longer exists or router not ready; swallow.
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Cold-start tap handling: if the user opened the app by tapping a push,
  // honor that deep link once auth is ready.
  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (handledColdStartRef.current) return;
    handledColdStartRef.current = true;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const data = (response.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
        const deepLinkPath = typeof data.deepLinkPath === "string" ? data.deepLinkPath : null;
        if (deepLinkPath) {
          try {
            router.push(resolveAdminOperationalDeepLink(deepLinkPath) as never);
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
  }, [isReady, isAuthenticated]);
}
