// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-shifts-settings
// @diffs: DIFF-ADMIN-SHF-001, DIFF-ADMIN-SET-001
// @do-not-edit: false

import { requestJson } from "@/src/services/httpClient";

// ── Shifts ────────────────────────────────────────────────────────────────────

export type ShiftRecordStatus = "Planned" | "Completed" | "Changed" | "Cancelled";

export interface ShiftListItemDto {
  id: string;
  nurseUserId: string;
  nurseDisplayName: string | null;
  careRequestId: string;
  careRequestReference: string | null;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  status: ShiftRecordStatus;
  createdAtUtc: string;
}

export interface ShiftDetailDto {
  id: string;
  nurseUserId: string;
  nurseDisplayName: string | null;
  nurseEmail: string | null;
  careRequestId: string;
  careRequestReference: string | null;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  status: ShiftRecordStatus;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface ShiftChangeHistoryItemDto {
  id: string;
  changedAtUtc: string;
  changedByActorName: string | null;
  previousStatus: ShiftRecordStatus | null;
  newStatus: ShiftRecordStatus | null;
  notes: string | null;
}

export interface ShiftListResultDto {
  items: ShiftListItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface ShiftListParams {
  pageNumber?: number;
  pageSize?: number;
  nurseId?: string;
  careRequestId?: string;
  startDate?: string;
  endDate?: string;
  status?: ShiftRecordStatus;
}

export async function listAdminShifts(params?: ShiftListParams): Promise<ShiftListResultDto> {
  const searchParams = new URLSearchParams();
  if (params?.pageNumber) searchParams.append("pageNumber", params.pageNumber.toString());
  if (params?.pageSize) searchParams.append("pageSize", params.pageSize.toString());
  if (params?.nurseId) searchParams.append("nurseId", params.nurseId);
  if (params?.careRequestId) searchParams.append("careRequestId", params.careRequestId);
  if (params?.startDate) searchParams.append("startDate", params.startDate);
  if (params?.endDate) searchParams.append("endDate", params.endDate);
  if (params?.status) searchParams.append("status", params.status);

  const suffix = searchParams.toString();
  return requestJson<ShiftListResultDto>({
    path: `/api/admin/shifts${suffix ? `?${suffix}` : ""}`,
    method: "GET",
    auth: true,
  });
}

export async function getAdminShiftDetail(id: string): Promise<ShiftDetailDto> {
  return requestJson<ShiftDetailDto>({
    path: `/api/admin/shifts/${id}`,
    method: "GET",
    auth: true,
  });
}

export async function getAdminShiftChanges(id: string): Promise<ShiftChangeHistoryItemDto[]> {
  return requestJson<ShiftChangeHistoryItemDto[]>({
    path: `/api/admin/shifts/${id}/changes`,
    method: "GET",
    auth: true,
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export type SettingValueType = "String" | "Integer" | "Decimal" | "Boolean" | "Json";

export interface SystemSettingDto {
  key: string;
  value: string;
  description: string | null;
  category: string;
  valueType: SettingValueType;
  allowedValuesJson: string | null;
  modifiedAtUtc: string | null;
  modifiedByActorName: string | null;
}

export async function listAdminSettings(): Promise<SystemSettingDto[]> {
  return requestJson<SystemSettingDto[]>({
    path: "/api/admin/settings",
    method: "GET",
    auth: true,
  });
}

export async function getAdminSetting(key: string): Promise<SystemSettingDto> {
  return requestJson<SystemSettingDto>({
    path: `/api/admin/settings/${encodeURIComponent(key)}`,
    method: "GET",
    auth: true,
  });
}

export async function updateAdminSetting(key: string, value: string): Promise<void> {
  return requestJson<void>({
    path: `/api/admin/settings/${encodeURIComponent(key)}`,
    method: "PUT",
    body: { value },
    auth: true,
  });
}
