import { requestJson } from "@/src/services/httpClient";
import { API_BASE_URL } from "@/src/config/api";
import { getCachedAuthSession, loadAuthSession } from "@/src/services/authSession";
import {
  CareRequestDto,
  CareRequestTransitionAction,
  CreateCareRequestDto,
} from "@/src/types/careRequest";

async function currentAuthToken(): Promise<string> {
  const session = getCachedAuthSession() ?? (await loadAuthSession());
  const token = session?.token;
  if (!token) {
    throw new Error("Sesión no disponible. Inicia sesión nuevamente.");
  }
  return token;
}

/**
 * Uploads a payment-proof image (invoice photo / transfer screenshot) and reports the payment.
 * Uses raw fetch with FormData (requestJson forces application/json which breaks multipart).
 */
export async function reportPayment(
  id: string,
  imageUri: string,
  mimeType: string,
  note?: string,
): Promise<CareRequestDto> {
  const token = await currentAuthToken();
  const form = new FormData();
  const ext = (mimeType.split("/")[1] || "jpg").replace("jpeg", "jpg");
  form.append("proof", { uri: imageUri, type: mimeType, name: `comprobante-${Date.now()}.${ext}` } as unknown as Blob);
  if (note && note.trim()) {
    form.append("note", note.trim());
  }

  const response = await fetch(`${API_BASE_URL}/api/care-requests/${id}/report-payment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, // no Content-Type: fetch sets the multipart boundary
    body: form,
  });

  const text = await response.text();
  if (!response.ok) {
    let message = "No se pudo reportar el pago.";
    try {
      const problem = JSON.parse(text);
      message = problem.detail || problem.title || message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return text ? (JSON.parse(text) as CareRequestDto) : ({} as CareRequestDto);
}

/** Admin: fetch the uploaded payment-proof image as a data URI for an <Image> source. */
export async function getPaymentProofImageDataUri(id: string): Promise<string> {
  const token = await currentAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/admin/care-requests/${id}/payment-proof`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("No se pudo cargar el comprobante de pago.");
  }
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo procesar la imagen del comprobante."));
    reader.readAsDataURL(blob);
  });
}

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
  const envelope = await requestJson<{ items: ActiveNurseProfileSummary[]; totalCount: number; page: number; pageSize: number }>({
    path: "/api/admin/nurse-profiles/active?page=1&pageSize=100",
    method: "GET",
    auth: true,
  });
  return envelope.items;
}

export interface PricingDiscrepancy {
  fieldName: string;
  storedValue: string;
  currentValue: string;
  difference: string;
}

export interface PricingVerificationResult {
  careRequestId: string;
  matches: boolean;
  toleranceUsed: number;
  limitationNotes: string[];
  discrepancies: PricingDiscrepancy[];
}

export async function verifyCareRequestPricing(id: string): Promise<PricingVerificationResult> {
  return requestJson<PricingVerificationResult>({
    path: `/api/care-requests/${id}/verify-pricing`,
    method: "GET",
    auth: true,
  });
}
