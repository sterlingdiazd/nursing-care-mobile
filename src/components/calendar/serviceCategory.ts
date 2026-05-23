import { designTokens } from "@/src/design-system/tokens";
import type { AdminCareRequestStatus } from "@/src/services/adminPortalService";

/** Service categories surfaced on the calendar. Derived from the care-request type code. */
export type ServiceCategory = "hogar" | "domicilio" | "otros";

/** hogar_* → hogar, domicilio_* → domicilio, everything else (medicos types) → otros. */
export function categoryOf(careRequestType: string): ServiceCategory {
  if (careRequestType.startsWith("hogar")) return "hogar";
  if (careRequestType.startsWith("domicilio")) return "domicilio";
  return "otros";
}

export const CATEGORY_META: Record<ServiceCategory, { label: string; color: string }> = {
  hogar: { label: "Hogar", color: designTokens.color.ink.accent }, // teal
  domicilio: { label: "Domicilio", color: designTokens.color.status.warningText }, // amber
  otros: { label: "Otros", color: designTokens.color.ink.muted }, // neutral
};

/** A single nurse assignment (or unassigned slot) on a given day, for the calendar. */
export interface CalendarAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  category: ServiceCategory;
  careRequestType: string;
  nurseUserId: string | null;
  nurseName: string | null;
  clientName: string;
  status: AdminCareRequestStatus;
  total: number;
}
