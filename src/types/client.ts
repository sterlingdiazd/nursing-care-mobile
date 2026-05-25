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
  title: string;
  body: string;
  createdAtUtc: string;
  readAtUtc?: string | null;
  careRequestId?: string | null;
  severity?: "info" | "success" | "warning" | "danger" | string | null;
}
