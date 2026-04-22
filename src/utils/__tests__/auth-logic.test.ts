import { describe, expect, it, vi } from "vitest";
import { validateEmail, validatePassword } from "@/src/api/auth";
import { 
  getTextOnlyFieldError, 
  getExactDigitsFieldError,
  getOptionalDigitsFieldError 
} from "@/src/utils/identityValidation";

describe("Auth Logic & Validation", () => {
  describe("Email Validation", () => {
    it("validates correct email formats", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name+tag@domain.co.uk")).toBe(true);
    });

    it("rejects invalid email formats", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("test@domain")).toBe(false);
      expect(validateEmail("@domain.com")).toBe(false);
    });
  });

  describe("Password Validation", () => {
    it("requires at least 6 characters", () => {
      expect(validatePassword("12345").isValid).toBe(false);
      expect(validatePassword("123456").isValid).toBe(true);
    });
  });

  describe("Identity Validation (Spanish UI)", () => {
    it("validates names and surnames (text only)", () => {
      expect(getTextOnlyFieldError("Juan", "El nombre")).toBe("");
      expect(getTextOnlyFieldError("Juan123", "El nombre")).toContain("solo acepta letras y espacios");
      expect(getTextOnlyFieldError("", "El nombre")).toContain("es obligatorio");
    });

    it("validates Cedula (11 digits)", () => {
      expect(getExactDigitsFieldError("40212345678", "La cédula", 11)).toBe("");
      expect(getExactDigitsFieldError("123", "La cédula", 11)).toContain("exactamente 11 digitos");
    });

    it("validates Phone (10 digits)", () => {
      expect(getExactDigitsFieldError("8095550101", "El teléfono", 10)).toBe("");
      expect(getExactDigitsFieldError("809555", "El teléfono", 10)).toContain("exactamente 10 digitos");
    });
  });
});
