import { requestJson, requestVoid } from "@/src/services/httpClient";
import type { ClientNotificationDto } from "@/src/types/client";

type ClientNotificationResponse =
  | ClientNotificationDto[]
  | {
      items?: ClientNotificationDto[];
      notifications?: ClientNotificationDto[];
      data?: ClientNotificationDto[] | { items?: ClientNotificationDto[] };
    };

function normalizeClientNotifications(response: ClientNotificationResponse): ClientNotificationDto[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  if (Array.isArray(response.notifications)) {
    return response.notifications;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data && "items" in response.data && Array.isArray(response.data.items)) {
    return response.data.items;
  }

  return [];
}

export async function getClientNotifications(): Promise<ClientNotificationDto[]> {
  // The endpoint returns a paginated envelope ({ items, totalCount, ... }), not a bare array.
  // Unwrap defensively so the screen always gets an array (a raw envelope here crashed the
  // client-notifications screen with "items.filter is not a function").
  const response = await requestJson<ClientNotificationDto[] | { items?: ClientNotificationDto[] }>({
    path: "/api/client/notifications?status=Active&pageSize=50",
    method: "GET",
    auth: true,
  });
  return normalizeClientNotifications(response);
}

export async function markClientNotificationRead(id: string): Promise<void> {
  await requestVoid({
    path: `/api/client/notifications/${id}/read`,
    method: "POST",
    auth: true,
  });
}

export async function markAllClientNotificationsRead(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => markClientNotificationRead(id)));
}
