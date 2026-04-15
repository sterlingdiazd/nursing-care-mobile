import { requestJson } from "@/src/services/httpClient";
import type {
  AvailableNurseOption,
  CatalogOptionsResponse,
  NurseProfileOptionsResponse,
} from "@/src/types/catalog";

export async function getCareRequestOptions(token: string) {
  return requestJson<CatalogOptionsResponse>({
    path: "/api/catalog/care-request-options",
    method: "GET",
    token,
    auth: true,
  });
}

export async function getNurseProfileOptions() {
  return requestJson<NurseProfileOptionsResponse>({
    path: "/api/catalog/nurse-profile-options",
    method: "GET",
    auth: false,
  });
}

export async function getAvailableNurses() {
  return requestJson<AvailableNurseOption[]>({
    path: "/api/catalog/available-nurses",
    method: "GET",
    auth: true,
  });
}
