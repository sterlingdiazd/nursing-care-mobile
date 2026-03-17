import { requestJson } from "@/src/services/httpClient";
import { CreateCareRequestDto } from "@/src/types/careRequest";

export interface CreateCareRequestResponse {
  id: string;
  residentId: string;
  description: string;
  status: string;
  createdAt: string;
  correlationId?: string;
}

export async function createCareRequest(
  dto: CreateCareRequestDto,
  token: string,
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
    token,
    onMeta: (meta) => {
      responseMeta = { correlationId: meta.correlationId };
    },
  });

  return {
    ...response,
    correlationId: responseMeta?.correlationId,
  };
}
