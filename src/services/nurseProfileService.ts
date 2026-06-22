import { requestJson } from "@/src/services/httpClient";
import type { NurseProfileDto, UpdateNurseProfileDto } from "@/src/types/nurse";

// Mirrors clientProfileService: the authenticated nurse reads/edits her OWN
// profile. The backend scopes both calls to the JWT subject — a nurse can only
// see/update herself, never another nurse and never client pricing.
// Backend dependency (Phase 2): GET/PUT `/api/nurse/profile`.

export async function getNurseProfile(): Promise<NurseProfileDto> {
  return requestJson<NurseProfileDto>({
    path: "/api/nurse/profile",
    method: "GET",
    auth: true,
  });
}

export async function updateNurseProfile(dto: UpdateNurseProfileDto): Promise<NurseProfileDto> {
  return requestJson<NurseProfileDto>({
    path: "/api/nurse/profile",
    method: "PUT",
    body: dto,
    auth: true,
  });
}
