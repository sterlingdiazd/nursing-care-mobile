import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { NativeModules, Platform } from "react-native";

import { requestVoid } from "@/src/services/httpClient";

const STORAGE_TOKEN_HINT = "lastRegisteredExpoPushToken";

// Foreground push handler. Industry standard for inbox-style apps: don't show
// a heads-up banner over the screen the user is already looking at; let the
// OS drop the item in Notification Center and update the bell badge instead.
// Background/closed pushes still display normally — that path is iOS native.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export interface RegisteredPushToken {
  expoPushToken: string;
  deviceId: string | null;
  platform: string;
}

function resolveLocale(): string | null {
  try {
    if (Platform.OS === "ios") {
      const settings = (NativeModules as any).SettingsManager?.settings;
      return settings?.AppleLocale ?? settings?.AppleLanguages?.[0] ?? null;
    }
    if (Platform.OS === "android") {
      return (NativeModules as any).I18nManager?.localeIdentifier ?? null;
    }
    return typeof navigator !== "undefined" ? navigator.language ?? null : null;
  } catch {
    return null;
  }
}

async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === "ios") {
      return (await Application.getIosIdForVendorAsync()) ?? null;
    }
    if (Platform.OS === "android") {
      return Application.getAndroidId?.() ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ask the user for permission, get the Expo push token, and POST it to the
 * backend so the server can deliver pushes to this device. Idempotent — safe
 * to call on every login + cold start. Returns the registered token on
 * success, or null if permission denied / running on non-physical device.
 */
export async function registerForPushAsync(): Promise<RegisteredPushToken | null> {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators/emulators reliably.
    return null;
  }

  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) {
    const ask = await Notifications.requestPermissionsAsync();
    granted = ask.granted || ask.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  if (!granted) return null;

  let tokenResult;
  try {
    tokenResult = await Notifications.getExpoPushTokenAsync();
  } catch {
    return null;
  }

  const expoPushToken = tokenResult?.data;
  if (!expoPushToken) return null;

  const deviceId = await getDeviceId();
  const locale = resolveLocale();

  await requestVoid({
    path: "/api/notifications/push-tokens",
    method: "POST",
    auth: true,
    body: {
      expoPushToken,
      platform: Platform.OS,
      deviceId,
      appVersion: Application.nativeApplicationVersion ?? null,
      locale,
    },
  });

  // Cache for de-dup logic in callers (avoid pinging backend if nothing changed).
  if (typeof globalThis !== "undefined") {
    (globalThis as any)[STORAGE_TOKEN_HINT] = expoPushToken;
  }

  return { expoPushToken, deviceId, platform: Platform.OS };
}

/**
 * On logout, deactivate the row for THIS device only. Don't touch other
 * devices the user may be signed in on.
 */
export async function deactivateTokenOnLogout(): Promise<void> {
  const deviceId = await getDeviceId();
  if (!deviceId) return;
  try {
    await requestVoid({
      path: `/api/notifications/push-tokens/${encodeURIComponent(deviceId)}`,
      method: "DELETE",
      auth: true,
    });
  } catch {
    // Logout shouldn't fail because the deactivate call failed; the token will
    // age out via the worker's DeviceNotRegistered cleanup if needed.
  }
}
