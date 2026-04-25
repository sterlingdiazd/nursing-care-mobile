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
    accountRoot: "account-screen-root",
    adminCareRequestDetailRoot: "admin-care-request-detail-root",
    adminCareRequestsListRoot: "admin-care-requests-list-root",
    adminHomeRoot: "admin-home-root",
    adminPayrollRoot: "admin-payroll-root",
    careRequestsListRoot: "care-requests-list-root",
    nursePayrollRoot: "nurse-payroll-root",
  },
} as const;
