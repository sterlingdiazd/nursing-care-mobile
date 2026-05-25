import { requestJson } from "@/src/services/httpClient";
import type { ClientProfileDto, UpdateClientProfileDto } from "@/src/types/client";

export async function getClientProfile(): Promise<ClientProfileDto> {
  return requestJson<ClientProfileDto>({
    path: "/api/client/profile",
    method: "GET",
    auth: true,
  });
}

export async function updateClientProfile(dto: UpdateClientProfileDto): Promise<ClientProfileDto> {
  return requestJson<ClientProfileDto>({
    path: "/api/client/profile",
    method: "PUT",
    body: dto,
    auth: true,
  });
}
