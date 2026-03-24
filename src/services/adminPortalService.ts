import { requestJson } from "@/src/services/httpClient";

export interface AdminDashboardAlertDto {
  id: string;
  title: string;
  description: string;
  modulePath: string;
}

export interface AdminDashboardSnapshotDto {
  pendingNurseProfilesCount: number;
  careRequestsWaitingForAssignmentCount: number;
  careRequestsWaitingForApprovalCount: number;
  careRequestsRejectedTodayCount: number;
  approvedCareRequestsStillIncompleteCount: number;
  overdueOrStaleRequestsCount: number;
  activeNursesCount: number;
  activeClientsCount: number;
  unreadAdminNotificationsCount: number;
  highSeverityAlerts: AdminDashboardAlertDto[];
  generatedAtUtc: string;
}

export interface AdminActionItemDto {
  id: string;
  severity: "High" | "Medium" | "Low";
  state: "Unread" | "Pending";
  entityType: "NurseProfile" | "CareRequest" | "UserAccount" | "SystemIssue";
  entityIdentifier: string;
  summary: string;
  requiredAction: string;
  assignedOwner: string | null;
  deepLinkPath: string;
  detectedAtUtc: string;
}

export interface AdminNotificationDto {
  id: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  deepLinkPath: string | null;
  source: string | null;
  requiresAction: boolean;
  isDismissed: boolean;
  createdAtUtc: string;
  readAtUtc: string | null;
  archivedAtUtc: string | null;
  createdBySystem: boolean;
}

export interface AdminNotificationSummaryDto {
  total: number;
  unread: number;
  requiresAction: number;
  highSeverityUnread: number;
}

export async function getAdminDashboard() {
  return requestJson<AdminDashboardSnapshotDto>({
    path: "/api/admin/dashboard",
    method: "GET",
    auth: true,
  });
}

export async function getAdminActionItems() {
  return requestJson<AdminActionItemDto[]>({
    path: "/api/admin/action-items",
    method: "GET",
    auth: true,
  });
}

export async function getAdminNotifications(params?: { includeArchived?: boolean; unreadOnly?: boolean }) {
  const searchParams = new URLSearchParams();
  if (params?.includeArchived) {
    searchParams.set("includeArchived", "true");
  }
  if (params?.unreadOnly) {
    searchParams.set("unreadOnly", "true");
  }

  const suffix = searchParams.toString();
  return requestJson<AdminNotificationDto[]>({
    path: `/api/admin/notifications${suffix ? `?${suffix}` : ""}`,
    method: "GET",
    auth: true,
  });
}

export async function getAdminNotificationSummary() {
  return requestJson<AdminNotificationSummaryDto>({
    path: "/api/admin/notifications/summary",
    method: "GET",
    auth: true,
  });
}

async function postAdminNotificationAction(
  id: string,
  action: "read" | "unread" | "archive" | "dismiss",
) {
  return requestJson<void>({
    path: `/api/admin/notifications/${id}/${action}`,
    method: "POST",
    auth: true,
  });
}

export const markAdminNotificationAsRead = (id: string) => postAdminNotificationAction(id, "read");
export const markAdminNotificationAsUnread = (id: string) => postAdminNotificationAction(id, "unread");
export const archiveAdminNotification = (id: string) => postAdminNotificationAction(id, "archive");
export const dismissAdminNotification = (id: string) => postAdminNotificationAction(id, "dismiss");

// Audit Log types and functions
export interface AuditLogListItemDto {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  notes: string | null;
  createdAtUtc: string;
}

export interface AuditLogDetailDto {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  notes: string | null;
  metadataJson: string | null;
  createdAtUtc: string;
}

export interface AuditLogSearchResultDto {
  items: AuditLogListItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface AuditLogSearchParams {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export async function searchAuditLogs(params?: AuditLogSearchParams) {
  const searchParams = new URLSearchParams();
  if (params?.actorUserId) searchParams.append("actorUserId", params.actorUserId);
  if (params?.action) searchParams.append("action", params.action);
  if (params?.entityType) searchParams.append("entityType", params.entityType);
  if (params?.entityId) searchParams.append("entityId", params.entityId);
  if (params?.fromDate) searchParams.append("fromDate", params.fromDate);
  if (params?.toDate) searchParams.append("toDate", params.toDate);
  if (params?.pageNumber) searchParams.append("pageNumber", params.pageNumber.toString());
  if (params?.pageSize) searchParams.append("pageSize", params.pageSize.toString());

  return requestJson<AuditLogSearchResultDto>({
    path: `/api/admin/audit-logs?${searchParams.toString()}`,
    method: "GET",
    auth: true,
  });
}

export async function getAuditLogDetail(id: string) {
  return requestJson<AuditLogDetailDto>({
    path: `/api/admin/audit-logs/${id}`,
    method: "GET",
    auth: true,
  });
}
