import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { registerForPushAsync } from "@/src/services/pushNotificationsService";
import { resolveNotificationNavTarget } from "@/src/utils/adminOperationalUx";

/**
 * Mounted once from the root layout. Responsibilities:
 *   1. Register the device's Expo push token whenever the user is authenticated
 *      (login or cold start). Idempotent on the backend.
 *   2. Wire the tap-to-deep-link handler. Tapping a notification (foreground,
 *      background, or cold start) opens the app to the `data.deepLinkPath`
 *      that the backend embedded in the push payload.
 */

function getRawPayload(response: Notifications.NotificationResponse): Record<string, unknown> {
  return (response.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
}

export function usePushNotifications() {
  const { isReady, isAuthenticated, userId, roles } = useAuth();
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
  // `roles` is in the dep array so the listener re-subscribes if roles change
  // (e.g. a freshly-granted admin role), capturing the current value in the
  // closure at subscription time.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const navTarget = resolveNotificationNavTarget(getRawPayload(response), roles);
      if (navTarget) {
        try {
          router.push(navTarget as never);
        } catch (err) {
          // Path not found or router not yet mounted (e.g. the user tapped a
          // push before the navigator finished rendering). The cold-start
          // handler below covers the latter case for app-open taps.
          if (__DEV__) console.warn("[push] foreground navigation failed:", navTarget, err);
        }
      }
    });
    return () => sub.remove();
  }, [roles]);

  // Cold-start tap handling: if the user opened the app by tapping a push,
  // honor that deep link once auth is ready.
  //
  // `roles` is listed as a dep to satisfy the exhaustive-deps rule and because
  // AuthContext sets `isAuthenticated` and `roles` in the same synchronous
  // state batch, so `roles` is already populated when this effect first fires.
  // The `handledColdStartRef` latch (line above the async call) ensures this
  // runs at most once per app lifecycle regardless of subsequent role changes.
  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (handledColdStartRef.current) return;
    handledColdStartRef.current = true;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const navTarget = resolveNotificationNavTarget(getRawPayload(response), roles);
        if (navTarget) {
          try {
            router.push(navTarget as never);
          } catch (err) {
            if (__DEV__) console.warn("[push] cold-start navigation failed:", navTarget, err);
          }
        }
      })
      .catch(() => {});
  }, [isReady, isAuthenticated, roles]);
}
