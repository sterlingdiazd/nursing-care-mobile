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

// Admin Care Requests types and functions
export type AdminCareRequestView =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "unassigned"
  | "pending-approval"
  | "rejected-today"
  | "approved-incomplete"
  | "overdue";

export type AdminCareRequestStatus = "Pending" | "Approved" | "Rejected" | "Completed";

export interface AdminCareRequestListItemDto {
  id: string;
  clientUserId: string;
  clientDisplayName: string;
  clientEmail: string;
  assignedNurseUserId: string | null;
  assignedNurseDisplayName: string | null;
  assignedNurseEmail: string | null;
  careRequestDescription: string;
  careRequestType: string;
  unit: number;
  unitType: string;
  total: number;
  careRequestDate: string | null;
  status: AdminCareRequestStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
  rejectedAtUtc: string | null;
  isOverdueOrStale: boolean;
}

export interface AdminCareRequestPricingBreakdownDto {
  category: string;
  basePrice: number;
  categoryFactor: number;
  distanceFactor: string | null;
  distanceFactorValue: number;
  complexityLevel: string | null;
  complexityFactorValue: number;
  volumeDiscountPercent: number;
  subtotalBeforeSupplies: number;
  medicalSuppliesCost: number;
  total: number;
}

export interface AdminCareRequestTimelineEventDto {
  id: string;
  title: string;
  description: string;
  occurredAtUtc: string;
}

export interface AdminCareRequestDetailDto {
  id: string;
  clientUserId: string;
  clientDisplayName: string;
  clientEmail: string;
  clientIdentificationNumber: string | null;
  assignedNurseUserId: string | null;
  assignedNurseDisplayName: string | null;
  assignedNurseEmail: string | null;
  careRequestDescription: string;
  careRequestType: string;
  unit: number;
  unitType: string;
  price: number;
  total: number;
  distanceFactor: string | null;
  complexityLevel: string | null;
  clientBasePrice: number | null;
  medicalSuppliesCost: number | null;
  careRequestDate: string | null;
  suggestedNurse: string | null;
  status: AdminCareRequestStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
  approvedAtUtc: string | null;
  rejectedAtUtc: string | null;
  completedAtUtc: string | null;
  isOverdueOrStale: boolean;
  pricingBreakdown: AdminCareRequestPricingBreakdownDto;
  timeline: AdminCareRequestTimelineEventDto[];
}

export interface AdminCareRequestClientOptionDto {
  userId: string;
  displayName: string;
  email: string;
  identificationNumber: string | null;
}

export interface CreateAdminCareRequestDto {
  clientUserId: string;
  careRequestDescription: string;
  careRequestType: string;
  unit?: number;
  suggestedNurse?: string;
  price?: number;
  clientBasePriceOverride?: number;
  distanceFactor?: string;
  complexityLevel?: string;
  medicalSuppliesCost?: number;
  careRequestDate?: string;
}

export async function getAdminCareRequests(params?: { view?: AdminCareRequestView; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.view && params.view !== "all") searchParams.append("view", params.view);
  if (params?.search) searchParams.append("search", params.search);

  return requestJson<AdminCareRequestListItemDto[]>({
    path: `/api/admin/care-requests?${searchParams.toString()}`,
    method: "GET",
    auth: true,
  });
}

export async function getAdminCareRequestDetail(id: string) {
  return requestJson<AdminCareRequestDetailDto>({
    path: `/api/admin/care-requests/${id}`,
    method: "GET",
    auth: true,
  });
}

export async function getAdminCareRequestClients(search?: string) {
  const searchParams = search ? `?search=${encodeURIComponent(search)}` : "";
  return requestJson<AdminCareRequestClientOptionDto[]>({
    path: `/api/admin/care-requests/clients${searchParams}`,
    method: "GET",
    auth: true,
  });
}

export async function createAdminCareRequest(request: CreateAdminCareRequestDto) {
  return requestJson<{ id: string }>({
    path: "/api/admin/care-requests",
    method: "POST",
    body: request,
    auth: true,
  });
}

// Nurse Profile types and functions
export interface NurseWorkloadSummaryDto {
  totalAssignedCareRequests?: number;
  pendingAssignedCareRequests?: number;
  approvedAssignedCareRequests?: number;
  rejectedAssignedCareRequests?: number;
  completedAssignedCareRequests?: number;
  lastCareRequestAtUtc?: string | null;
}

export interface PendingNurseProfileDto {
  userId: string;
  email: string;
  name: string | null;
  lastName: string | null;
  identificationNumber: string | null;
  phone: string | null;
  hireDate?: string | null;
  specialty?: string | null;
  createdAtUtc: string;
}

export interface NurseProfileSummaryDto {
  userId: string;
  email: string;
  name: string | null;
  lastName: string | null;
  specialty: string | null;
  category: string | null;
  userIsActive?: boolean;
  nurseProfileIsActive?: boolean;
  isProfileComplete?: boolean;
  isAssignmentReady?: boolean;
  createdAtUtc?: string;
  workload?: NurseWorkloadSummaryDto;
}

export type ActiveNurseProfileSummaryDto = NurseProfileSummaryDto;

export interface NurseProfileAdminRecordDto {
  userId: string;
  email: string;
  name: string | null;
  lastName: string | null;
  identificationNumber: string | null;
  phone: string | null;
  profileType: AdminUserProfileType;
  userIsActive: boolean;
  nurseProfileIsActive: boolean;
  isProfileComplete?: boolean;
  isPendingReview?: boolean;
  isAssignmentReady?: boolean;
  hasHistoricalCareRequests?: boolean;
  createdAtUtc: string;
  hireDate: string | null;
  specialty: string | null;
  licenseId: string | null;
  bankName: string | null;
  accountNumber: string | null;
  category: string | null;
  workload?: NurseWorkloadSummaryDto;
}

export interface NurseProfileIdentityRequest {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
  email: string;
  hireDate: string;
  specialty: string;
  licenseId?: string | null;
  bankName: string;
  accountNumber?: string | null;
  category: string;
}

export interface CreateNurseProfileRequest extends NurseProfileIdentityRequest {
  password: string;
  confirmPassword: string;
  isOperationallyActive: boolean;
}

export type UpdateNurseProfileRequest = NurseProfileIdentityRequest;
export type CompleteNurseProfileRequest = NurseProfileIdentityRequest;

// Client types and functions
export type AdminClientListStatus = "active" | "inactive";

export interface AdminClientListParams {
  search?: string;
  status?: AdminClientListStatus;
}

export interface AdminClientListItemDto {
  userId: string;
  email: string;
  displayName: string;
  name: string | null;
  lastName: string | null;
  identificationNumber: string | null;
  phone: string | null;
  isActive: boolean;
  ownedCareRequestsCount: number;
  lastCareRequestAtUtc: string | null;
  createdAtUtc: string;
}

export interface AdminClientCareRequestHistoryItemDto {
  careRequestId: string;
  careRequestDescription: string;
  careRequestType: string;
  status: AdminCareRequestStatus;
  total: number;
  careRequestDate: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  assignedNurseDisplayName: string | null;
  assignedNurseEmail: string | null;
}

export interface AdminClientDetailDto {
  userId: string;
  email: string;
  displayName: string;
  name: string | null;
  lastName: string | null;
  identificationNumber: string | null;
  phone: string | null;
  isActive: boolean;
  ownedCareRequestsCount: number;
  lastCareRequestAtUtc: string | null;
  hasHistoricalCareRequests: boolean;
  canAdminCreateCareRequest: boolean;
  createdAtUtc: string;
  careRequestHistory: AdminClientCareRequestHistoryItemDto[];
}

export interface CreateAdminClientRequest {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateAdminClientRequest {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
  email: string;
}

// User types and functions
export type AdminUserRoleName = "ADMIN" | "CLIENT" | "NURSE";
export type AdminUserProfileType = "ADMIN" | "CLIENT" | "NURSE";
export type AdminUserAccountStatus =
  | "Active"
  | "Inactive"
  | "ProfileIncomplete"
  | "AdminReview"
  | "ManualIntervention";

export interface AdminUserListParams {
  search?: string;
  role?: AdminUserRoleName;
  profileType?: AdminUserProfileType;
  status?: AdminUserAccountStatus;
}

export interface AdminUserListItemDto {
  id: string;
  email: string;
  displayName: string;
  name: string | null;
  lastName: string | null;
  identificationNumber: string | null;
  phone: string | null;
  profileType: AdminUserProfileType;
  roleNames: AdminUserRoleName[];
  isActive: boolean;
  accountStatus: AdminUserAccountStatus;
  requiresProfileCompletion: boolean;
  requiresAdminReview: boolean;
  requiresManualIntervention: boolean;
  createdAtUtc: string;
}

export interface AdminUserNurseProfileDto {
  isActive: boolean;
  hireDate: string | null;
  specialty: string | null;
  licenseId: string | null;
  bankName: string | null;
  accountNumber: string | null;
  category: string | null;
  assignedCareRequestsCount: number;
}

export interface AdminUserClientProfileDto {
  ownedCareRequestsCount: number;
}

export interface AdminUserDetailDto {
  id: string;
  email: string;
  displayName: string;
  name: string | null;
  lastName: string | null;
  identificationNumber: string | null;
  phone: string | null;
  profileType: AdminUserProfileType;
  roleNames: AdminUserRoleName[];
  allowedRoleNames: AdminUserRoleName[];
  isActive: boolean;
  accountStatus: AdminUserAccountStatus;
  requiresProfileCompletion: boolean;
  requiresAdminReview: boolean;
  requiresManualIntervention: boolean;
  hasOperationalHistory: boolean;
  activeRefreshTokenCount: number;
  createdAtUtc: string;
  nurseProfile: AdminUserNurseProfileDto | null;
  clientProfile: AdminUserClientProfileDto | null;
}

export interface UpdateAdminUserRequest {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
  email: string;
}

export interface CreateAdminAccountRequest {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface InvalidateAdminUserSessionsResult {
  userId: string;
  revokedActiveSessionCount: number;
}

// Catalog types and functions
export type CatalogResourceType =
  | "care-request-categories"
  | "care-request-types"
  | "unit-types"
  | "distance-factors"
  | "complexity-levels"
  | "volume-discount-rules"
  | "nurse-specialties"
  | "nurse-categories";

export interface CareRequestCategoryListItemDto {
  id: string;
  code: string;
  displayName: string;
  categoryFactor: number;
  isActive: boolean;
  displayOrder: number;
}

export interface CareRequestTypeListItemDto {
  id: string;
  code: string;
  displayName: string;
  careRequestCategoryCode: string;
  unitTypeCode: string;
  basePrice: number;
  isActive: boolean;
  displayOrder: number;
}

export interface UnitTypeListItemDto {
  id: string;
  code: string;
  displayName: string;
  isActive: boolean;
  displayOrder: number;
}

export interface DistanceFactorListItemDto {
  id: string;
  code: string;
  displayName: string;
  multiplier: number;
  isActive: boolean;
  displayOrder: number;
}

export interface ComplexityLevelListItemDto {
  id: string;
  code: string;
  displayName: string;
  multiplier: number;
  isActive: boolean;
  displayOrder: number;
}

export interface VolumeDiscountRuleListItemDto {
  id: string;
  minimumCount: number;
  discountPercent: number;
  isActive: boolean;
  displayOrder: number;
}

export interface NurseSpecialtyListItemDto {
  id: string;
  code: string;
  displayName: string;
  alternativeCodes: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface NurseCategoryListItemDto {
  id: string;
  code: string;
  displayName: string;
  alternativeCodes: string | null;
  isActive: boolean;
  displayOrder: number;
}


// Nurse Profile service functions
export async function getPendingNurseProfiles() {
  return requestJson<PendingNurseProfileDto[]>({
    path: "/api/admin/nurse-profiles/pending",
    method: "GET",
    auth: true,
  });
}

export async function getActiveNurseProfiles() {
  return requestJson<ActiveNurseProfileSummaryDto[]>({
    path: "/api/admin/nurse-profiles/active",
    method: "GET",
    auth: true,
  });
}

export async function getInactiveNurseProfiles() {
  return requestJson<NurseProfileSummaryDto[]>({
    path: "/api/admin/nurse-profiles/inactive",
    method: "GET",
    auth: true,
  });
}

export async function getNurseProfileForAdmin(userId: string) {
  return requestJson<NurseProfileAdminRecordDto>({
    path: `/api/admin/nurse-profiles/${userId}`,
    method: "GET",
    auth: true,
  });
}

export async function createNurseProfileForAdmin(request: CreateNurseProfileRequest) {
  return requestJson<NurseProfileAdminRecordDto>({
    path: "/api/admin/nurse-profiles",
    method: "POST",
    body: request,
    auth: true,
  });
}

export async function updateNurseProfileForAdmin(
  userId: string,
  request: UpdateNurseProfileRequest,
) {
  return requestJson<NurseProfileAdminRecordDto>({
    path: `/api/admin/nurse-profiles/${userId}`,
    method: "PUT",
    body: request,
    auth: true,
  });
}

export async function completeNurseProfileForAdmin(
  userId: string,
  request: CompleteNurseProfileRequest,
) {
  return requestJson<NurseProfileAdminRecordDto>({
    path: `/api/admin/nurse-profiles/${userId}/complete`,
    method: "PUT",
    body: request,
    auth: true,
  });
}

export async function setNurseOperationalAccessForAdmin(
  userId: string,
  isOperationallyActive: boolean,
) {
  return requestJson<NurseProfileAdminRecordDto>({
    path: `/api/admin/nurse-profiles/${userId}/operational-access`,
    method: "PUT",
    body: { isOperationallyActive },
    auth: true,
  });
}


// Client service functions
export async function getAdminClients(params: AdminClientListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }

  const suffix = searchParams.toString();
  return requestJson<AdminClientListItemDto[]>({
    path: `/api/admin/clients${suffix ? `?${suffix}` : ""}`,
    method: "GET",
    auth: true,
  });
}

export async function getAdminClientDetail(id: string) {
  return requestJson<AdminClientDetailDto>({
    path: `/api/admin/clients/${id}`,
    method: "GET",
    auth: true,
  });
}

export async function createAdminClient(request: CreateAdminClientRequest) {
  return requestJson<AdminClientDetailDto>({
    path: "/api/admin/clients",
    method: "POST",
    body: request,
    auth: true,
  });
}

export async function updateAdminClient(id: string, request: UpdateAdminClientRequest) {
  return requestJson<AdminClientDetailDto>({
    path: `/api/admin/clients/${id}`,
    method: "PUT",
    body: request,
    auth: true,
  });
}

export async function updateAdminClientActiveState(id: string, isActive: boolean) {
  return requestJson<AdminClientDetailDto>({
    path: `/api/admin/clients/${id}/active-state`,
    method: "PUT",
    body: { isActive },
    auth: true,
  });
}


// User service functions
export async function getAdminUsers(params: AdminUserListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.role) {
    searchParams.set("role", params.role);
  }
  if (params.profileType) {
    searchParams.set("profileType", params.profileType);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }

  const suffix = searchParams.toString();
  return requestJson<AdminUserListItemDto[]>({
    path: `/api/admin/users${suffix ? `?${suffix}` : ""}`,
    method: "GET",
    auth: true,
  });
}

export async function getAdminUserDetail(id: string) {
  return requestJson<AdminUserDetailDto>({
    path: `/api/admin/users/${id}`,
    method: "GET",
    auth: true,
  });
}

export async function updateAdminUser(id: string, request: UpdateAdminUserRequest) {
  return requestJson<AdminUserDetailDto>({
    path: `/api/admin/users/${id}`,
    method: "PUT",
    body: request,
    auth: true,
  });
}

export async function updateAdminUserRoles(id: string, roleNames: AdminUserRoleName[]) {
  return requestJson<AdminUserDetailDto>({
    path: `/api/admin/users/${id}/roles`,
    method: "PUT",
    body: { roleNames },
    auth: true,
  });
}

export async function updateAdminUserActiveState(id: string, isActive: boolean) {
  return requestJson<AdminUserDetailDto>({
    path: `/api/admin/users/${id}/active-state`,
    method: "PUT",
    body: { isActive },
    auth: true,
  });
}

export async function invalidateAdminUserSessions(id: string) {
  return requestJson<InvalidateAdminUserSessionsResult>({
    path: `/api/admin/users/${id}/invalidate-sessions`,
    method: "POST",
    auth: true,
  });
}


// Admin Account service functions
export async function createAdminAccount(request: CreateAdminAccountRequest) {
  return requestJson<AdminUserDetailDto>({
    path: "/api/admin/admin-accounts",
    method: "POST",
    body: request,
    auth: true,
  });
}

// Catalog service functions
export async function listCareRequestCategories(includeInactive = false) {
  const path = `/api/admin/catalog/care-request-categories${includeInactive ? "?includeInactive=true" : ""}`;
  return requestJson<CareRequestCategoryListItemDto[]>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createCareRequestCategory(body: {
  code: string;
  displayName: string;
  categoryFactor: number;
  isActive: boolean;
  displayOrder: number;
}) {
  return requestJson<string>({
    path: "/api/admin/catalog/care-request-categories",
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateCareRequestCategory(
  id: string,
  body: {
    displayName: string;
    categoryFactor: number;
    isActive: boolean;
    displayOrder: number;
  },
) {
  return requestJson<void>({
    path: `/api/admin/catalog/care-request-categories/${id}`,
    method: "PUT",
    body,
    auth: true,
  });
}

export async function listCareRequestTypes(includeInactive = false) {
  const path = `/api/admin/catalog/care-request-types${includeInactive ? "?includeInactive=true" : ""}`;
  return requestJson<CareRequestTypeListItemDto[]>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createCareRequestType(body: {
  code: string;
  displayName: string;
  careRequestCategoryCode: string;
  unitTypeCode: string;
  basePrice: number;
  isActive: boolean;
  displayOrder: number;
}) {
  return requestJson<string>({
    path: "/api/admin/catalog/care-request-types",
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateCareRequestType(
  id: string,
  body: {
    displayName: string;
    careRequestCategoryCode: string;
    unitTypeCode: string;
    basePrice: number;
    isActive: boolean;
    displayOrder: number;
  },
) {
  return requestJson<void>({
    path: `/api/admin/catalog/care-request-types/${id}`,
    method: "PUT",
    body,
    auth: true,
  });
}

export async function listUnitTypes(includeInactive = false) {
  const path = `/api/admin/catalog/unit-types${includeInactive ? "?includeInactive=true" : ""}`;
  return requestJson<UnitTypeListItemDto[]>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createUnitType(body: {
  code: string;
  displayName: string;
  isActive: boolean;
  displayOrder: number;
}) {
  return requestJson<string>({
    path: "/api/admin/catalog/unit-types",
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateUnitType(
  id: string,
  body: { displayName: string; isActive: boolean; displayOrder: number },
) {
  return requestJson<void>({
    path: `/api/admin/catalog/unit-types/${id}`,
    method: "PUT",
    body,
    auth: true,
  });
}

export async function listDistanceFactors(includeInactive = false) {
  const path = `/api/admin/catalog/distance-factors${includeInactive ? "?includeInactive=true" : ""}`;
  return requestJson<DistanceFactorListItemDto[]>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createDistanceFactor(body: {
  code: string;
  displayName: string;
  multiplier: number;
  isActive: boolean;
  displayOrder: number;
}) {
  return requestJson<string>({
    path: "/api/admin/catalog/distance-factors",
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateDistanceFactor(
  id: string,
  body: { displayName: string; multiplier: number; isActive: boolean; displayOrder: number },
) {
  return requestJson<void>({
    path: `/api/admin/catalog/distance-factors/${id}`,
    method: "PUT",
    body,
    auth: true,
  });
}

export async function listComplexityLevels(includeInactive = false) {
  const path = `/api/admin/catalog/complexity-levels${includeInactive ? "?includeInactive=true" : ""}`;
  return requestJson<ComplexityLevelListItemDto[]>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createComplexityLevel(body: {
  code: string;
  displayName: string;
  multiplier: number;
  isActive: boolean;
  displayOrder: number;
}) {
  return requestJson<string>({
    path: "/api/admin/catalog/complexity-levels",
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateComplexityLevel(
  id: string,
  body: { displayName: string; multiplier: number; isActive: boolean; displayOrder: number },
) {
  return requestJson<void>({
    path: `/api/admin/catalog/complexity-levels/${id}`,
    method: "PUT",
    body,
    auth: true,
  });
}

export async function listVolumeDiscountRules(includeInactive = false) {
  const path = `/api/admin/catalog/volume-discount-rules${includeInactive ? "?includeInactive=true" : ""}`;
  return requestJson<VolumeDiscountRuleListItemDto[]>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createVolumeDiscountRule(body: {
  minimumCount: number;
  discountPercent: number;
  isActive: boolean;
  displayOrder: number;
}) {
  return requestJson<string>({
    path: "/api/admin/catalog/volume-discount-rules",
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateVolumeDiscountRule(
  id: string,
  body: { minimumCount: number; discountPercent: number; isActive: boolean; displayOrder: number },
) {
  return requestJson<void>({
    path: `/api/admin/catalog/volume-discount-rules/${id}`,
    method: "PUT",
    body,
    auth: true,
  });
}

export async function listNurseSpecialties(includeInactive = false) {
  const path = `/api/admin/catalog/nurse-specialties${includeInactive ? "?includeInactive=true" : ""}`;
  return requestJson<NurseSpecialtyListItemDto[]>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createNurseSpecialty(body: {
  code: string;
  displayName: string;
  alternativeCodes: string | null;
  isActive: boolean;
  displayOrder: number;
}) {
  return requestJson<string>({
    path: "/api/admin/catalog/nurse-specialties",
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateNurseSpecialty(
  id: string,
  body: { displayName: string; alternativeCodes: string | null; isActive: boolean; displayOrder: number },
) {
  return requestJson<void>({
    path: `/api/admin/catalog/nurse-specialties/${id}`,
    method: "PUT",
    body,
    auth: true,
  });
}

export async function listNurseCategories(includeInactive = false) {
  const path = `/api/admin/catalog/nurse-categories${includeInactive ? "?includeInactive=true" : ""}`;
  return requestJson<NurseCategoryListItemDto[]>({
    path,
    method: "GET",
    auth: true,
  });
}

export async function createNurseCategory(body: {
  code: string;
  displayName: string;
  alternativeCodes: string | null;
  isActive: boolean;
  displayOrder: number;
}) {
  return requestJson<string>({
    path: "/api/admin/catalog/nurse-categories",
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateNurseCategory(
  id: string,
  body: { displayName: string; alternativeCodes: string | null; isActive: boolean; displayOrder: number },
) {
  return requestJson<void>({
    path: `/api/admin/catalog/nurse-categories/${id}`,
    method: "PUT",
    body,
    auth: true,
  });
}
