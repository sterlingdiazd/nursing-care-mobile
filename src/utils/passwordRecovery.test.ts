import {
  FORGOT_PASSWORD_SUCCESS_BODY,
  FORGOT_PASSWORD_SUCCESS_INFO,
  RESET_PASSWORD_HELP_TEXT,
  RESET_PASSWORD_SUCCESS_FALLBACK_MESSAGE,
  buildPasswordResetSuccessAlert,
  formatPasswordRecoveryCountdown,
  getForgotPasswordResendInfo,
  getForgotPasswordResendLabel,
} from "./passwordRecovery";

describe("passwordRecovery", () => {
  it("formats the resend countdown in mm:ss", () => {
    expect(formatPasswordRecoveryCountdown(60)).toBe("01:00");
    expect(formatPasswordRecoveryCountdown(59)).toBe("00:59");
  });

  it("builds resend labels and helper text in Spanish", () => {
    expect(getForgotPasswordResendLabel(60)).toBe("Reenviar en 01:00");
    expect(getForgotPasswordResendLabel(0)).toBe("Reenviar código");
    expect(getForgotPasswordResendInfo(60)).toBe("Podrás solicitar otro código en 01:00.");
    expect(getForgotPasswordResendInfo(0)).toBe("Ya puedes solicitar un nuevo código con el mismo correo.");
  });

  it("keeps the forgot-password recovery guidance aligned with the app copy", () => {
    expect(FORGOT_PASSWORD_SUCCESS_BODY).toContain("promociones y spam");
    expect(FORGOT_PASSWORD_SUCCESS_INFO).toContain("contacta al soporte del sistema");
    expect(RESET_PASSWORD_HELP_TEXT).toContain("vuelve a solicitarlo");
  });

  it("builds a reset success alert that requires a fresh login", () => {
    expect(buildPasswordResetSuccessAlert()).toEqual({
      title: "Éxito",
      message: RESET_PASSWORD_SUCCESS_FALLBACK_MESSAGE,
      actionLabel: "Aceptar",
      redirectPath: "/login",
    });
  });

  it("prefers the server-provided reset success message when available", () => {
    expect(buildPasswordResetSuccessAlert("Clave actualizada. Inicia sesión otra vez.").message)
      .toBe("Clave actualizada. Inicia sesión otra vez.");
  });
});
