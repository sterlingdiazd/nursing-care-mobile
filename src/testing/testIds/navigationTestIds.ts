// Navigation test identifier constants
// Aligned with UC-011, UC-012, UC-013, UC-014 selector contracts.

// Static literal maps for the known tab keys, so dynamically-keyed tab testIDs are statically
// discoverable by the testID validator (it scans these literals). btn/label/icon keep their (key)
// API and fall back to the template for any key not listed here, so runtime behavior is unchanged.
const TAB_BTN_BY_KEY: Record<string, string> = {
  index: "nav-tab-btn-index",
  "care-requests": "nav-tab-btn-care-requests",
  account: "nav-tab-btn-account",
  "admin/payroll": "nav-tab-btn-admin/payroll",
  "nurse/payroll": "nav-tab-btn-nurse/payroll",
};
const TAB_LABEL_BY_KEY: Record<string, string> = {
  index: "nav-tab-label-index",
  "care-requests": "nav-tab-label-care-requests",
  account: "nav-tab-label-account",
  "admin/payroll": "nav-tab-label-admin/payroll",
  "nurse/payroll": "nav-tab-label-nurse/payroll",
};
const TAB_ICON_BY_KEY: Record<string, string> = {
  "care-requests": "nav-tab-icon-care-requests",
};

export const navigationTestIds = {
  shell: {
    primaryReturnButton: "nav-shell-primary-return-button",
  },
  tabBar: {
    root: "nav-tab-bar-root",
    btn: (key: string) => TAB_BTN_BY_KEY[key] ?? `nav-tab-btn-${key}`,
    icon: (key: string) => TAB_ICON_BY_KEY[key] ?? `nav-tab-icon-${key}`,
    label: (key: string) => TAB_LABEL_BY_KEY[key] ?? `nav-tab-label-${key}`,
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
} as const;
