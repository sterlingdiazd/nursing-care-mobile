// Navigation test identifier constants
// Aligned with UC-011, UC-012, UC-013, UC-014 selector contracts.

export const navigationTestIds = {
  shell: {
    primaryReturnButton: "nav-shell-primary-return-button",
  },
  tabBar: {
    root: "nav-tab-bar-root",
    btn: (key: string) => `nav-tab-btn-${key}`,
    icon: (key: string) => `nav-tab-icon-${key}`,
    label: (key: string) => `nav-tab-label-${key}`,
  },
  footer: {
    root: "nav-app-footer-root",
    actionBar: "nav-footer-action-bar",
  },
  screens: {
    careRequestsListRoot: "care-requests-list-root",
    adminCareRequestsListRoot: "admin-care-requests-list-root",
    adminCareRequestDetailRoot: "admin-care-request-detail-root",
    nursePayrollRoot: "nurse-payroll-root",
    adminPayrollRoot: "admin-payroll-root",
    adminHomeRoot: "admin-home-root",
  },
  adminCareRequests: {
    listRoot: "admin-care-requests-list-root",
    listItemFirst: "admin-care-requests-list-item-0",
    detailRoot: "admin-care-request-detail-root",
  },
} as const;
