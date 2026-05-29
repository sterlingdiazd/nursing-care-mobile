export interface ClientProfileDto {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
  email?: string | null;
  preferredAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface UpdateClientProfileDto {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
  preferredAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface ClientNotificationDto {
  id: string;
  category?: string | null;
  title: string;
  body: string;
  createdAtUtc: string;
  readAtUtc?: string | null;
  careRequestId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  deepLinkPath?: string | null;
  source?: string | null;
  requiresAction?: boolean;
  isDismissed?: boolean;
  archivedAtUtc?: string | null;
  createdBySystem?: boolean;
  severity?: "info" | "success" | "warning" | "danger" | string | null;
}
