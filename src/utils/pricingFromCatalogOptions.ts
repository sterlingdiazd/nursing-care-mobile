import type { CatalogOptionsResponse } from "@/src/types/catalog";

export function resolveVolumeDiscountPercent(
  rules: ReadonlyArray<{ minimumCount: number; discountPercent: number }>,
  existingSameUnitTypeCount: number,
): number {
  if (existingSameUnitTypeCount <= 0) {
    return 0;
  }

  const ordered = [...rules].sort((a, b) => a.minimumCount - b.minimumCount);
  let applicable = 0;
  for (const rule of ordered) {
    if (existingSameUnitTypeCount >= rule.minimumCount) {
      applicable = rule.discountPercent;
    }
  }

  return applicable;
}

export function estimateCareRequestPricingFromCatalog(
  options: CatalogOptionsResponse,
  input: {
    careRequestTypeCode: string;
    unit: number;
    clientBasePriceOverride?: number | null;
    distanceFactorCode?: string | null;
    complexityLevelCode?: string | null;
    medicalSuppliesCost?: number | null;
    existingSameUnitTypeCount: number;
  },
) {
  const unit = input.unit;
  if (unit <= 0) {
    throw new Error("La cantidad debe ser mayor que cero.");
  }

  const typeRow = options.careRequestTypes.find((t) => t.code === input.careRequestTypeCode);
  if (!typeRow) {
    throw new Error("El tipo de solicitud no esta disponible en el catalogo.");
  }

  const categoryRow = options.careRequestCategories.find((c) => c.code === typeRow.careRequestCategoryCode);
  if (!categoryRow) {
    throw new Error("La categoria de precios no esta disponible en el catalogo.");
  }

  let categoryFactor = categoryRow.categoryFactor;
  if (categoryFactor <= 0) {
    categoryFactor = 1;
  }

  let basePrice =
    typeof input.clientBasePriceOverride === "number" && input.clientBasePriceOverride > 0
      ? input.clientBasePriceOverride
      : typeRow.basePrice;

  if (basePrice <= 0) {
    basePrice = 60;
  }

  const categoryCode = categoryRow.code;
  const isDomicilio = categoryCode.toLowerCase() === "domicilio";
  const isHogarOrDomicilio =
    categoryCode.toLowerCase() === "hogar" || isDomicilio;

  let distanceMultiplier = 1;
  if (isDomicilio) {
    const code = (input.distanceFactorCode ?? "local").trim();
    const distanceRow = options.distanceFactors.find((d) => d.code === code);
    if (!distanceRow) {
      throw new Error("El factor de distancia no es valido.");
    }
    distanceMultiplier = distanceRow.multiplier;
  }

  let complexityMultiplier = 1;
  if (isHogarOrDomicilio) {
    const code = (input.complexityLevelCode ?? "estandar").trim();
    const complexityRow = options.complexityLevels.find((c) => c.code === code);
    if (!complexityRow) {
      throw new Error("El nivel de complejidad no es valido.");
    }
    complexityMultiplier = complexityRow.multiplier;
  }

  const volumeDiscountPercent = resolveVolumeDiscountPercent(
    options.volumeDiscountRules,
    input.existingSameUnitTypeCount,
  );

  const lineBeforeVolumeDiscount = basePrice * categoryFactor * distanceMultiplier * complexityMultiplier;
  const unitPriceAfterVolumeDiscount = lineBeforeVolumeDiscount * (1 - volumeDiscountPercent / 100);

  let supplies = input.medicalSuppliesCost ?? 0;
  if (supplies < 0) {
    throw new Error("Los insumos medicos no pueden ser negativos.");
  }

  const subtotalBeforeSupplies = unitPriceAfterVolumeDiscount * unit;
  const grandTotal = subtotalBeforeSupplies + supplies;

  return {
    unitPriceAfterVolumeDiscount,
    grandTotal,
    volumeDiscountPercent,
    categoryFactor,
    distanceMultiplier,
    complexityMultiplier,
  };
}
