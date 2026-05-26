import { requestJson, requestVoid } from "@/src/services/httpClient";
import type { ClientNotificationDto } from "@/src/types/client";

export async function getClientNotifications(): Promise<ClientNotificationDto[]> {
  // The endpoint returns a paginated envelope ({ items, totalCount, ... }), not a bare array.
  // Unwrap defensively so the screen always gets an array (a raw envelope here crashed the
  // client-notifications screen with "items.filter is not a function").
  const response = await requestJson<ClientNotificationDto[] | { items?: ClientNotificationDto[] }>({
    path: "/api/client/notifications",
    method: "GET",
    auth: true,
  });
  return Array.isArray(response) ? response : (response?.items ?? []);
}

export async function markClientNotificationRead(id: string): Promise<void> {
  await requestVoid({
    path: `/api/client/notifications/${id}/read`,
    method: "PUT",
    auth: true,
  });
}

export async function markAllClientNotificationsRead(): Promise<void> {
  await requestVoid({
    path: "/api/client/notifications/read-all",
    method: "PUT",
    auth: true,
  });
}
