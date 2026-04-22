import React from "react";
import renderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginScreen from "../login";
import RegisterScreen from "../register";
import { authTestIds } from "@/src/testing/authTestIds";

vi.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    completeProfile: vi.fn(),
    completeOAuthLogin: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    isAuthenticated: false,
    requiresProfileCompletion: false,
    email: null,
  }),
  UserProfileType: {
    CLIENT: "CLIENT",
    NURSE: "NURSE",
    ADMIN: "ADMIN",
  },
}));

vi.mock("@/src/services/authService", () => ({
  getGoogleOAuthStartUrl: () => "https://google-auth",
}));

vi.mock("@/src/services/catalogOptionsService", () => ({
  getNurseProfileOptions: vi.fn().mockResolvedValue({ specialties: [] }),
}));

vi.mock("@/assets/images/icon.png", () => ({
  default: 1,
}));

function findByText(component: renderer.ReactTestRenderer, text: string) {
  return component.root.findByProps({ children: text });
}

async function renderScreen(element: React.ReactElement) {
  let component!: renderer.ReactTestRenderer;

  await act(async () => {
    component = renderer.create(element);
  });

  return component;
}

describe("Auth UI Screens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LoginScreen", () => {
    it("renders the login screen correctly", async () => {
      const component = await renderScreen(<LoginScreen />);

      expect(findByText(component, "Iniciar Sesión")).toBeTruthy();
      expect(component.root.findByProps({ testID: authTestIds.login.emailInput })).toBeTruthy();
      expect(findByText(component, "Entrar")).toBeTruthy();
    });

    it("shows validation error for empty email on blur", async () => {
      const component = await renderScreen(<LoginScreen />);
      const emailInput = component.root.findByProps({ testID: authTestIds.login.emailInput });

      await act(async () => {
        emailInput.props.onBlur();
      });

      expect(findByText(component, "El correo es obligatorio")).toBeTruthy();
    });
  });

  describe("RegisterScreen (Multi-step)", () => {
    it("starts at the identity step", async () => {
      const component = await renderScreen(<RegisterScreen />);

      expect(findByText(component, "Información Personal")).toBeTruthy();
      expect(component.root.findByProps({ testID: authTestIds.register.nameInput })).toBeTruthy();
      expect(findByText(component, "Siguiente")).toBeTruthy();
    });

    it("shows errors when moving to role step with empty identity fields", async () => {
      const component = await renderScreen(<RegisterScreen />);
      const nextButton = component.root.findByProps({ testID: authTestIds.register.submitButton });

      await act(async () => {
        nextButton.props.onPress();
      });

      expect(findByText(component, "El nombre es obligatorio")).toBeTruthy();
      expect(findByText(component, "El apellido es obligatorio")).toBeTruthy();
    });

    it("advances to role step when identity fields are filled", async () => {
      const component = await renderScreen(<RegisterScreen />);

      await act(async () => {
        component.root.findByProps({ testID: authTestIds.register.nameInput }).props.onChangeText("Juan");
        component.root.findByProps({ testID: authTestIds.register.lastNameInput }).props.onChangeText("Perez");
        component.root.findByProps({ testID: authTestIds.register.identificationInput }).props.onChangeText("00112345678");
        component.root.findByProps({ testID: authTestIds.register.phoneInput }).props.onChangeText("8095550101");
      });

      await act(async () => {
        component.root.findByProps({ testID: authTestIds.register.submitButton }).props.onPress();
      });

      expect(findByText(component, "Tipo de Perfil")).toBeTruthy();
      expect(component.root.findAllByProps({ children: "Información Personal" })).toHaveLength(0);
    });
  });
});
