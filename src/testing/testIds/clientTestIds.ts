export const clientTestIds = {
  home: {
    screen: "client-home-screen",
    intentCard: (key: string) => `client-home-intent-${key}`,
  },
  profile: {
    screen: "client-profile-screen",
    editButton: "client-profile-edit-button",
    saveButton: "client-profile-save-button",
    nameInput: "client-profile-name-input",
    lastNameInput: "client-profile-lastname-input",
    identificationInput: "client-profile-identification-input",
    phoneInput: "client-profile-phone-input",
    addressInput: "client-profile-address-input",
    emergencyNameInput: "client-profile-emergency-name-input",
    emergencyPhoneInput: "client-profile-emergency-phone-input",
  },
  notifications: {
    screen: "client-notifications-screen",
    markAllButton: "client-notifications-mark-all-button",
    row: (id: string) => `client-notification-row-${id}`,
    markReadButton: (id: string) => `client-notification-mark-read-${id}`,
  },
} as const;
