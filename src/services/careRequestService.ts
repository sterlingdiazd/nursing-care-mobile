import { requestJson } from "@/src/services/httpClient";
import {
  CareRequestDto,
  CareRequestTransitionAction,
  CreateCareRequestDto,
} from "@/src/types/careRequest";

export interface CreateCareRequestResponse {
  id: string;
  correlationId?: string;
}

export interface ActiveNurseProfileSummary {
  userId: string;
  email: string;
  name: string | null;
  lastName: string | null;
  specialty: string | null;
  category: string | null;
}

export interface AssignCareRequestNurseRequest {
  assignedNurse: string;
}

export async function createCareRequest(
  dto: CreateCareRequestDto,
  correlationId?: string,
): Promise<CreateCareRequestResponse> {
  let responseMeta:
    | {
        correlationId: string;
      }
    | undefined;

  const response = await requestJson<CreateCareRequestResponse>({
    path: "/api/care-requests",
    method: "POST",
    body: dto,
    correlationId,
    auth: true,
    onMeta: (meta) => {
      responseMeta = { correlationId: meta.correlationId };
    },
  });

  return {
    ...response,
    correlationId: responseMeta?.correlationId,
  };
}

export async function getCareRequests(): Promise<CareRequestDto[]> {
  return requestJson<CareRequestDto[]>({
    path: "/api/care-requests",
    method: "GET",
    auth: true,
  });
}

export async function getCareRequestById(id: string): Promise<CareRequestDto> {
  return requestJson<CareRequestDto>({
    path: `/api/care-requests/${id}`,
    method: "GET",
    auth: true,
  });
}

export async function transitionCareRequest(
  id: string,
  action: CareRequestTransitionAction,
): Promise<CareRequestDto> {
  return requestJson<CareRequestDto>({
    path: `/api/care-requests/${id}/${action}`,
    method: "POST",
    auth: true,
  });
}

export async function assignCareRequestNurse(
  id: string,
  dto: AssignCareRequestNurseRequest,
): Promise<CareRequestDto> {
  return requestJson<CareRequestDto>({
    path: `/api/care-requests/${id}/assignment`,
    method: "PUT",
    body: dto,
    auth: true,
  });
}

export async function getActiveNurseProfiles(): Promise<ActiveNurseProfileSummary[]> {
  return requestJson<ActiveNurseProfileSummary[]>({
    path: "/api/admin/nurse-profiles/active",
    method: "GET",
    auth: true,
  });
}
