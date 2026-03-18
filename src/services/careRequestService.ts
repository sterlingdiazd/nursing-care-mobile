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

export async function createCareRequest(dto: CreateCareRequestDto): Promise<CreateCareRequestResponse> {
  let responseMeta:
    | {
        correlationId: string;
      }
    | undefined;

  const response = await requestJson<CreateCareRequestResponse>({
    path: "/api/care-requests",
    method: "POST",
    body: dto,
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
