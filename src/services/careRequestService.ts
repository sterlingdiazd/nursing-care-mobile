import { Platform } from "react-native";
import { requestList } from "@/src/services/apiShape";
import { requestJson } from "@/src/services/httpClient";
import { API_BASE_URL } from "@/src/config/api";
import { getCachedAuthSession, loadAuthSession } from "@/src/services/authSession";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
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
/** Structured payment claim (anti-fraud): what the client says they paid, for the admin to match
 *  against the bank. All optional — the image alone still works. */
export interface PaymentClaimInput {
  bankReference?: string;
  amount?: number;
  paymentDate?: string; // yyyy-MM-dd
  payingBank?: string;
  ocrAssessment?: PaymentOcrAssessment;
  ocrClientEdited?: boolean;
}

export interface PaymentOcrAssessment {
  draftSentence: string;
  extractedBankReference?: string | null;
  extractedAmount?: number | null;
  extractedPaymentDate?: string | null;
  extractedBank?: string | null;
  confidence: number;
  warnings: string[];
  provider: string;
  assessedAtUtc: string;
}

async function appendPaymentProofFile(form: FormData, imageUri: string, mimeType: string) {
  const ext = (mimeType.split("/")[1] || "jpg").replace("jpeg", "jpg");

  if (Platform.OS === "web" || imageUri.startsWith("data:") || imageUri.startsWith("blob:")) {
    try {
      const blobRes = await fetch(imageUri);
      const blob = await blobRes.blob();
      form.append("proof", blob, `comprobante-${Date.now()}.${ext}`);
    } catch (e) {
      console.error("Failed to convert image URI to blob, falling back to pseudo-blob", e);
      form.append("proof", { uri: imageUri, type: mimeType, name: `comprobante-${Date.now()}.${ext}` } as unknown as Blob);
    }
  } else {
    form.append("proof", { uri: imageUri, type: mimeType, name: `comprobante-${Date.now()}.${ext}` } as unknown as Blob);
  }
}

// Hard ceiling for the OCR round-trip. The backend tries a chain of providers
// (Azure -> Google Vision -> OCR.space), each bounded to a few seconds, so even
// when a fallback runs the call finishes well inside this window. This guard is
// only a last-resort net for a dead network / unreachable server: it aborts the
// fetch instead of leaving the "Leyendo comprobante..." spinner (and the
// disabled submit button) hung forever. It is set above the server's worst-case
// chain time so it never cuts off a fallback that is still working.
const OCR_REQUEST_TIMEOUT_MS = 30000;

export async function assessPaymentProofOcr(
  id: string,
  imageUri: string,
  mimeType: string,
): Promise<PaymentOcrAssessment> {
  const token = await currentAuthToken();
  const form = new FormData();
  await appendPaymentProofFile(form, imageUri, mimeType);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/care-requests/${id}/payment-proof/ocr`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    // Diagnostic-only: the caller logs this and continues with manual entry.
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OCR request timed out after ${OCR_REQUEST_TIMEOUT_MS}ms`);
    }
    throw new Error("OCR request failed before reaching the server");
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  if (!response.ok) {
    let message = "No se pudo leer el comprobante automáticamente.";
    try {
      const problem = JSON.parse(text);
      message = problem.detail || problem.title || message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return JSON.parse(text) as PaymentOcrAssessment;
}

export async function reportPayment(
  id: string,
  imageUri: string,
  mimeType: string,
  note?: string,
  claim?: PaymentClaimInput,
): Promise<CareRequestDto> {
  const token = await currentAuthToken();
  const form = new FormData();
  await appendPaymentProofFile(form, imageUri, mimeType);

  if (note && note.trim()) {
    form.append("note", note.trim());
  }

  // Structured claim (bound to the backend ReportPaymentForm; field names are case-insensitive).
  if (claim?.bankReference && claim.bankReference.trim()) {
    form.append("claimedBankReference", claim.bankReference.trim());
  }
  if (claim?.amount != null && Number.isFinite(claim.amount)) {
    form.append("claimedAmount", String(claim.amount));
  }
  if (claim?.paymentDate && claim.paymentDate.trim()) {
    form.append("claimedPaymentDate", claim.paymentDate.trim());
  }
  if (claim?.payingBank && claim.payingBank.trim()) {
    form.append("payingBank", claim.payingBank.trim());
  }
  if (claim?.ocrAssessment) {
    const ocr = claim.ocrAssessment;
    form.append("ocrDraftSentence", ocr.draftSentence);
    if (ocr.extractedBankReference) form.append("ocrExtractedBankReference", ocr.extractedBankReference);
    if (ocr.extractedAmount != null && Number.isFinite(ocr.extractedAmount)) {
      form.append("ocrExtractedAmount", String(ocr.extractedAmount));
    }
    if (ocr.extractedPaymentDate) form.append("ocrExtractedPaymentDate", ocr.extractedPaymentDate);
    if (ocr.extractedBank) form.append("ocrExtractedBank", ocr.extractedBank);
    form.append("ocrConfidence", String(ocr.confidence));
    form.append("ocrWarningsJson", JSON.stringify(ocr.warnings ?? []));
    form.append("ocrProvider", ocr.provider);
    form.append("ocrAssessedAtUtc", ocr.assessedAtUtc);
    form.append("ocrClientEdited", claim.ocrClientEdited ? "true" : "false");
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
  return requestList<CareRequestDto>({
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

export async function downloadAndShareCareRequestReceipt(id: string): Promise<string> {
  const token = await currentAuthToken();
  const fileName = `recibo-solicitud-${id}.pdf`;
  const destination = new File(Paths.cache, fileName);

  const file = await File.downloadFileAsync(
    `${API_BASE_URL}/api/care-requests/${id}/receipt`,
    destination,
    {
      idempotent: true,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
    },
  );

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Este dispositivo no permite compartir el recibo en este momento.");
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Compartir recibo",
  });

  return file.uri;
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

/**
 * Nurse accepts the assignment offered to her. The backend moves the request from
 * `Asignada` to `Approved` (no admin re-approval) and stamps the accepted time.
 * Returns the refreshed care request (nurse-facing: client pricing stripped).
 */
export async function acceptAssignment(id: string): Promise<CareRequestDto> {
  return requestJson<CareRequestDto>({
    path: `/api/care-requests/${id}/accept-assignment`,
    method: "POST",
    auth: true,
  });
}

/**
 * Nurse rejects the assignment. A reason is required by the backend (it tells the
 * admin why to reassign). The request returns to `Pending` with the nurse cleared,
 * so it leaves her queue.
 */
export async function rejectAssignment(id: string, reason: string): Promise<CareRequestDto> {
  return requestJson<CareRequestDto>({
    path: `/api/care-requests/${id}/reject-assignment`,
    method: "POST",
    body: { reason },
    auth: true,
  });
}

/**
 * Fetch the current nurse's own care requests scheduled in an inclusive
 * [from, to] date range. Used by the nurse service calendar.
 * The backend date-filter parameter names mirror the admin endpoint.
 */
export async function getNurseCareRequestsInRange(range: { from: string; to: string }): Promise<CareRequestDto[]> {
  const params = new URLSearchParams();
  params.set("from", range.from);
  params.set("to", range.to);
  return requestList<CareRequestDto>({
    path: `/api/care-requests?${params.toString()}`,
    method: "GET",
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
