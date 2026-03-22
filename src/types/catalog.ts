export interface CareRequestCategoryOption {
  code: string;
  displayName: string;
  categoryFactor: number;
}

export interface CareRequestTypeOption {
  code: string;
  displayName: string;
  careRequestCategoryCode: string;
  unitTypeCode: string;
  basePrice: number;
}

export interface CatalogCodeNameOption {
  code: string;
  displayName: string;
}

export interface DistanceFactorOption extends CatalogCodeNameOption {
  multiplier: number;
}

export interface ComplexityLevelOption extends CatalogCodeNameOption {
  multiplier: number;
}

export interface VolumeDiscountRuleOption {
  minimumCount: number;
  discountPercent: number;
}

export interface CatalogOptionsResponse {
  careRequestCategories: CareRequestCategoryOption[];
  careRequestTypes: CareRequestTypeOption[];
  unitTypes: CatalogCodeNameOption[];
  distanceFactors: DistanceFactorOption[];
  complexityLevels: ComplexityLevelOption[];
  volumeDiscountRules: VolumeDiscountRuleOption[];
}

export interface NurseProfileOptionsResponse {
  specialties: CatalogCodeNameOption[];
  categories: CatalogCodeNameOption[];
}
