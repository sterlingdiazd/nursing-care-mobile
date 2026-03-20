export interface CreateCareRequestDto {
  careRequestDescription: string;
  careRequestType: string;
  unit?: number;
  nurseId?: string;
  suggestedNurse?: string;
  assignedNurse?: string;
  price?: number;
  clientBasePriceOverride?: number;
  distanceFactor?: string;
  complexityLevel?: string;
  medicalSuppliesCost?: number;
  careRequestDate?: string; // YYYY-MM-DD
}

export interface CareRequestDto {
  id: string;
  userID: string;
  careRequestDescription: string;
  careRequestType?: string;
  unit?: number;
  unitType?: string;
  price?: number;
  total?: number;
  distanceFactor?: string | null;
  complexityLevel?: string | null;
  clientBasePrice?: number | null;
  medicalSuppliesCost?: number | null;
  careRequestDate?: string | null;
  status: "Pending" | "Approved" | "Rejected" | "Completed";
  createdAtUtc: string;
  updatedAtUtc: string;
  approvedAtUtc: string | null;
  rejectedAtUtc: string | null;
  completedAtUtc: string | null;
}

export type CareRequestTransitionAction = "approve" | "reject" | "complete";
