export const PASSWORD_RECOVERY_RESEND_COOLDOWN_SECONDS = 60;

export const FORGOT_PASSWORD_SUCCESS_TITLE = "Código enviado";
export const FORGOT_PASSWORD_SUCCESS_BODY =
  "Si el correo está registrado, recibirás un código de 6 dígitos. Revisa tu bandeja de entrada, promociones y spam.";
export const FORGOT_PASSWORD_SUCCESS_INFO =
  "El código expira en 15 minutos. Si no lo recibes después de varios intentos, contacta al soporte del sistema.";
export const RESET_PASSWORD_HELP_TEXT =
  "Si no te llegó el código, revisa spam o promociones y vuelve a solicitarlo desde la pantalla anterior.";
export const RESET_PASSWORD_SUCCESS_FALLBACK_MESSAGE =
  "Tu contraseña ha sido restablecida. Inicia sesión con tu nueva contraseña.";

export function formatPasswordRecoveryCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function getForgotPasswordResendLabel(cooldownRemaining: number) {
  return cooldownRemaining > 0
    ? `Reenviar en ${formatPasswordRecoveryCountdown(cooldownRemaining)}`
    : "Reenviar código";
}

export function getForgotPasswordResendInfo(cooldownRemaining: number) {
  return cooldownRemaining > 0
    ? `Podrás solicitar otro código en ${formatPasswordRecoveryCountdown(cooldownRemaining)}.`
    : "Ya puedes solicitar un nuevo código con el mismo correo.";
}

export function buildPasswordResetSuccessAlert(message?: string) {
  return {
    title: "Éxito",
    message: message || RESET_PASSWORD_SUCCESS_FALLBACK_MESSAGE,
    actionLabel: "Aceptar",
    redirectPath: "/login",
  } as const;
}
