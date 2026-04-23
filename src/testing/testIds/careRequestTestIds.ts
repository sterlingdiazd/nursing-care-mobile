export const careRequestTestIds = {
  list: {
    screen: "care-request-list-screen",
  },
  detail: {
    screen: "care-detail-page",
    statusChip: "care-detail-status-chip",
    errorBanner: "care-detail-error-banner",
    primaryAction: "price-breakdown-verify-button",
    pricingReviewPanel: "price-verification-modal",
    pricingReviewConfirmButton: "price-verification-confirm-button",
    pricingBreakdownToggle: "care-detail-pricing-breakdown-toggle",
  },
  create: {
    screen: "care-request-create-screen",
    descriptionInput: "create-care-request-description-input",
    suggestedNurseInput: "create-care-request-suggested-nurse-input",
    suggestedNurseOptions: "create-care-request-suggested-nurse-options",
    submitButton: "create-care-request-submit-button",
  },
} as const;
