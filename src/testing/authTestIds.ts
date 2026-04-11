export const authTestIds = {
  login: {
    screen: "auth-login-screen",
    emailInput: "auth-login-email-input",
    passwordInput: "auth-login-password-input",
    submitButton: "auth-login-submit-button",
    forgotPasswordLink: "auth-login-forgot-password-link",
    googleButton: "auth-login-google-button",
    registerLink: "auth-login-register-link",
    emailError: "auth-login-email-error",
    passwordError: "auth-login-password-error",
  },
  register: {
    screen: "auth-register-screen",
  },
  forgotPassword: {
    screen: "auth-forgot-password-screen",
    emailInput: "auth-forgot-password-email-input",
    submitButton: "auth-forgot-password-submit-button",
    enterCodeButton: "auth-forgot-password-enter-code-button",
    resendButton: "auth-forgot-password-resend-button",
    emailError: "auth-forgot-password-email-error",
    errorBanner: "auth-forgot-password-error-banner",
    successCard: "auth-forgot-password-success-card",
  },
  resetPassword: {
    screen: "auth-reset-password-screen",
    emailInput: "auth-reset-password-email-input",
    codeInput: "auth-reset-password-code-input",
    newPasswordInput: "auth-reset-password-new-password-input",
    confirmPasswordInput: "auth-reset-password-confirm-password-input",
    submitButton: "auth-reset-password-submit-button",
    emailError: "auth-reset-password-email-error",
    codeError: "auth-reset-password-code-error",
    passwordError: "auth-reset-password-password-error",
  },
} as const;

export function testProps(testId: string) {
  return {
    testID: testId,
    nativeID: testId,
  } as const;
}
