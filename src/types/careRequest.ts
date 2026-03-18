export interface CreateCareRequestDto {
  residentId: string;
  description: string;
}

export interface CareRequestDto {
  id: string;
  residentId: string;
  description: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed";
  createdAtUtc: string;
  updatedAtUtc: string;
  approvedAtUtc: string | null;
  rejectedAtUtc: string | null;
  completedAtUtc: string | null;
}

export type CareRequestTransitionAction = "approve" | "reject" | "complete";
