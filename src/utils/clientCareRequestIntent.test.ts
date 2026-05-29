import { describe, expect, it } from "vitest";

import {
  applyClientIntentDefaultsToForm,
  buildClientIntentDefaults,
  CLIENT_CARE_REQUEST_INTENTS,
} from "@/src/utils/clientCareRequestIntent";
import type { CatalogOptionsResponse } from "@/src/types/catalog";
import type { CreateCareRequestDto } from "@/src/types/careRequest";

const catalog: CatalogOptionsResponse = {
  careRequestCategories: [
    { code: "hogar", displayName: "Hogar", categoryFactor: 1 },
    { code: "domicilio", displayName: "Domicilio", categoryFactor: 1.2 },
    { code: "medicos", displayName: "Médicos", categoryFactor: 1.5 },
  ],
  careRequestTypes: [
    { code: "hogar_diario", displayName: "Hogar diario", careRequestCategoryCode: "hogar", unitTypeCode: "dia_completo", basePrice: 2500 },
    { code: "domicilio_dia_12h", displayName: "Domicilio día (12h)", careRequestCategoryCode: "domicilio", unitTypeCode: "medio_dia", basePrice: 2500 },
    { code: "domicilio_24h", displayName: "Domicilio 24h", careRequestCategoryCode: "domicilio", unitTypeCode: "dia_completo", basePrice: 3500 },
    { code: "curas", displayName: "Curas", careRequestCategoryCode: "medicos", unitTypeCode: "sesion", basePrice: 2000 },
  ],
  unitTypes: [],
  distanceFactors: [
    { code: "local", displayName: "Local", multiplier: 1 },
    { code: "media", displayName: "Media", multiplier: 1.2 },
  ],
  complexityLevels: [
    { code: "estandar", displayName: "Estándar", multiplier: 1 },
    { code: "moderada", displayName: "Moderada", multiplier: 1.1 },
  ],
  volumeDiscountRules: [],
};

const emptyForm: CreateCareRequestDto = {
  careRequestDescription: "",
  suggestedNurse: "",
  careRequestDate: undefined,
  careRequestType: "",
  unit: 1,
  distanceFactor: "local",
  complexityLevel: "estandar",
  clientBasePriceOverride: undefined,
  medicalSuppliesCost: undefined,
};

describe("client care request intents", () => {
  it("provides a distinct operational default for each client intent", () => {
    const now = new Date("2026-05-26T12:00:00");
    const todayDefaults = buildClientIntentDefaults("hoy", catalog, now);
    const scheduledDefaults = buildClientIntentDefaults("programar", catalog, now);
    const medicalDefaults = buildClientIntentDefaults("medico", catalog, now);

    expect(todayDefaults).toMatchObject({
      careRequestType: "domicilio_24h",
      careRequestDate: "2026-05-26",
      complexityLevel: "moderada",
      activeCategoryCode: "domicilio",
    });
    expect(scheduledDefaults).toMatchObject({
      careRequestType: "domicilio_dia_12h",
      careRequestDate: "2026-05-27",
      activeCategoryCode: "domicilio",
    });
    expect(medicalDefaults).toMatchObject({
      careRequestType: "",
      careRequestDate: "2026-05-26",
      medicalSuppliesCost: 0,
      activeCategoryCode: "medicos",
    });
  });

  it("applies intent defaults without overwriting custom user notes", () => {
    const defaults = buildClientIntentDefaults("hoy", catalog, new Date("2026-05-26T12:00:00"));
    const form = applyClientIntentDefaultsToForm(
      { ...emptyForm, careRequestDescription: "Mi papá necesita supervisión después de una caída." },
      defaults,
    );

    expect(form.careRequestDescription).toBe("Mi papá necesita supervisión después de una caída.");
    expect(form.careRequestType).toBe("domicilio_24h");
    expect(form.careRequestDate).toBe("2026-05-26");
  });

  it("keeps the visible intent list aligned with the requested three choices", () => {
    expect(CLIENT_CARE_REQUEST_INTENTS.map((intent) => intent.title)).toEqual([
      "Necesito ayuda hoy",
      "Quiero programar una visita",
      "Necesito apoyo médico",
    ]);
  });
});
