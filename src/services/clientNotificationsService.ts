import { requestJson, requestVoid } from "@/src/services/httpClient";
import type { ClientNotificationDto } from "@/src/types/client";

export async function getClientNotifications(): Promise<ClientNotificationDto[]> {
  return requestJson<ClientNotificationDto[]>({
    path: "/api/client/notifications",
    method: "GET",
    auth: true,
  });
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
