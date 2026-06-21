import type { CatalogCodeNameOption, CatalogOptionsResponse } from "@/src/types/catalog";
import type { CreateCareRequestDto } from "@/src/types/careRequest";

export type ClientCareRequestIntentKey = "hoy" | "programar" | "medico";

interface ClientCareRequestIntent {
  key: ClientCareRequestIntentKey;
  title: string;
  description: string;
  typeCandidates: string[];
  categoryFallback: string;
  preselectService: boolean;
  dateOffsetDays?: number;
  unit: number;
  distanceFactor: string;
  complexityLevel: string;
  medicalSuppliesCost?: number;
}

export interface ClientIntentDefaults {
  careRequestDescription: string;
  careRequestType: string;
  careRequestDate?: string;
  unit: number;
  distanceFactor: string;
  complexityLevel: string;
  medicalSuppliesCost?: number;
  activeCategoryCode: string;
}

export const CLIENT_CARE_REQUEST_INTENTS: readonly ClientCareRequestIntent[] = [
  {
    key: "hoy",
    title: "Necesito ayuda hoy",
    description: "Necesito cuidado lo antes posible. ",
    typeCandidates: ["domicilio_24h", "domicilio_dia_12h", "hogar_diario"],
    categoryFallback: "domicilio",
    preselectService: true,
    dateOffsetDays: 0,
    unit: 1,
    distanceFactor: "local",
    complexityLevel: "moderada",
  },
  {
    key: "programar",
    title: "Quiero programar una visita",
    description: "Quiero programar una visita de cuidado. ",
    typeCandidates: ["domicilio_dia_12h", "hogar_diario", "domicilio_noche_12h"],
    categoryFallback: "domicilio",
    preselectService: true,
    dateOffsetDays: 1,
    unit: 1,
    distanceFactor: "local",
    complexityLevel: "estandar",
  },
  {
    key: "medico",
    title: "Necesito apoyo médico",
    description: "Necesito apoyo médico en casa. ",
    typeCandidates: ["curas", "medicamentos", "suero"],
    categoryFallback: "medicos",
    preselectService: false,
    dateOffsetDays: 0,
    unit: 1,
    distanceFactor: "local",
    complexityLevel: "estandar",
    medicalSuppliesCost: 0,
  },
] as const;

export function getClientCareRequestIntent(key?: string | null) {
  return CLIENT_CARE_REQUEST_INTENTS.find((intent) => intent.key === key) ?? null;
}

export function isClientIntentDescription(value: string) {
  return CLIENT_CARE_REQUEST_INTENTS.some((intent) => value.startsWith(intent.description));
}

export function buildClientIntentDefaults(
  key: ClientCareRequestIntentKey,
  catalogOptions: CatalogOptionsResponse | null,
  now = new Date(),
): ClientIntentDefaults {
  const intent = getClientCareRequestIntent(key) ?? CLIENT_CARE_REQUEST_INTENTS[0];
  const selectedType = intent.preselectService
    ? intent.typeCandidates
        .map((candidate) => catalogOptions?.careRequestTypes.find((type) => type.code === candidate))
        .find(Boolean) ??
      catalogOptions?.careRequestTypes.find((type) => type.careRequestCategoryCode === intent.categoryFallback) ??
      catalogOptions?.careRequestTypes[0]
    : undefined;

  return {
    careRequestDescription: intent.description,
    careRequestType: selectedType?.code ?? "",
    careRequestDate:
      typeof intent.dateOffsetDays === "number"
        ? formatDateToLocalIso(addDays(now, intent.dateOffsetDays))
        : undefined,
    unit: intent.unit,
    distanceFactor: pickCatalogCode(catalogOptions?.distanceFactors, intent.distanceFactor, "local"),
    complexityLevel: pickCatalogCode(catalogOptions?.complexityLevels, intent.complexityLevel, "estandar"),
    medicalSuppliesCost: intent.medicalSuppliesCost,
    activeCategoryCode: selectedType?.careRequestCategoryCode ?? intent.categoryFallback,
  };
}

function pickCatalogCode(
  options: CatalogCodeNameOption[] | undefined,
  preferredCode: string,
  fallbackCode: string,
) {
  if (!options || options.length === 0) {
    return preferredCode || fallbackCode;
  }

  return options.find((option) => option.code === preferredCode)?.code ?? options[0]?.code ?? fallbackCode;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateToLocalIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function applyClientIntentDefaultsToForm(
  form: CreateCareRequestDto,
  defaults: ClientIntentDefaults,
): CreateCareRequestDto {
  const shouldReplaceDescription =
    form.careRequestDescription.trim().length === 0 ||
    isClientIntentDescription(form.careRequestDescription);

  return {
    ...form,
    careRequestDescription: shouldReplaceDescription
      ? defaults.careRequestDescription
      : form.careRequestDescription,
    careRequestType: defaults.careRequestType,
    careRequestDate: defaults.careRequestDate ?? form.careRequestDate,
    unit: defaults.unit,
    distanceFactor: defaults.distanceFactor,
    complexityLevel: defaults.complexityLevel,
    medicalSuppliesCost: defaults.medicalSuppliesCost,
  };
}
