const textOnlyRegex = /^[\p{L} ]+$/u;
const digitsOnlyRegex = /^\d+$/;
const forbiddenTextCharsRegex = /[^\p{L} ]/u;
const forbiddenDigitsCharsRegex = /\D/;

export function sanitizeTextOnlyInput(value: string) {
  return value.replace(/[^\p{L} ]+/gu, "").replace(/\s{2,}/g, " ");
}

export function sanitizeDigitsOnlyInput(value: string, maxLength?: number) {
  const digits = value.replace(/\D+/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

export function getRejectedTextOnlyInputError(value: string, label: string) {
  if (forbiddenTextCharsRegex.test(value)) {
    return `${label} solo acepta letras y espacios`;
  }

  return "";
}

export function getRejectedDigitsOnlyInputError(value: string, label: string, maxLength?: number) {
  if (forbiddenDigitsCharsRegex.test(value)) {
    return `${label} solo acepta numeros`;
  }

  if (typeof maxLength === "number" && value.length > maxLength) {
    return `${label} debe tener exactamente ${maxLength} digitos`;
  }

  return "";
}

export function getTextOnlyFieldError(value: string, label: string, required = true) {
  const trimmed = value.trim();

  if (!trimmed) {
    return required ? `${label} es obligatorio` : "";
  }

  if (!textOnlyRegex.test(trimmed)) {
    return `${label} solo acepta letras y espacios`;
  }

  return "";
}

export function getExactDigitsFieldError(value: string, label: string, length: number, required = true) {
  const trimmed = value.trim();

  if (!trimmed) {
    return required ? `${label} es obligatorio` : "";
  }

  if (!digitsOnlyRegex.test(trimmed)) {
    return `${label} solo acepta numeros`;
  }

  if (trimmed.length !== length) {
    return `${label} debe tener exactamente ${length} digitos`;
  }

  return "";
}

export function getOptionalDigitsFieldError(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (!digitsOnlyRegex.test(trimmed)) {
    return `${label} solo acepta numeros`;
  }

  return "";
}
