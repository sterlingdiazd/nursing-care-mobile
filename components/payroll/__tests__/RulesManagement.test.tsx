import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { RuleListItem } from "../RuleListItem";
import { CreateRuleModal } from "../CreateRuleModal";

// Mock dependencies are already set up in setupTests.ts

describe("RulesManagement", () => {
  const mockRule = {
    id: "rule-1",
    name: "Night Shift Bonus",
    employmentType: "FullTime",
    baseCompensationPercent: 70,
    transportIncentivePercent: 10,
    complexityBonusPercent: 15,
    medicalSuppliesPercent: 5,
    isActive: true,
    createdAtUtc: "2024-01-01T00:00:00Z",
  };

  const mockOnPress = vi.fn();
  const mockOnSubmit = vi.fn(() => Promise.resolve());
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RuleListItem", () => {
    it("renders rule information correctly", () => {
      const component = renderer.create(
        <RuleListItem rule={mockRule} onPress={mockOnPress} />
      );
      expect(component.root.findByProps({ children: "Night Shift Bonus" })).toBeTruthy();
      expect(component.root.findByProps({ children: "Tiempo Completo" })).toBeTruthy();
      expect(component.root.findByProps({ children: "70%" })).toBeTruthy();
      expect(component.root.findByProps({ children: "10%" })).toBeTruthy();
      expect(component.root.findByProps({ children: "15%" })).toBeTruthy();
      expect(component.root.findByProps({ children: "5%" })).toBeTruthy();
    });

    it("calls onPress when pressed", () => {
      const component = renderer.create(
        <RuleListItem rule={mockRule} onPress={mockOnPress} />
      );
      const { TouchableOpacity } = require("react-native");
      const touchable = component.root.findByType(TouchableOpacity);
      act(() => {
        touchable.props.onPress();
      });
      expect(mockOnPress).toHaveBeenCalledWith(mockRule);
    });

    it("shows active status badge for active rule", () => {
      const component = renderer.create(
        <RuleListItem rule={mockRule} onPress={mockOnPress} />
      );
      expect(component.root.findByProps({ children: "Activa" })).toBeTruthy();
    });

    it("shows inactive status badge for inactive rule", () => {
      const inactiveRule = { ...mockRule, isActive: false };
      const component = renderer.create(
        <RuleListItem rule={inactiveRule} onPress={mockOnPress} />
      );
      expect(component.root.findByProps({ children: "Inactiva" })).toBeTruthy();
    });
  });

  describe("CreateRuleModal", () => {
    it("renders modal with form fields", () => {
      const component = renderer.create(
        <CreateRuleModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      );
      expect(component.root.findByProps({ children: "Nueva Regla de Compensación" })).toBeTruthy();
      expect(component.root.findByProps({ placeholder: "Nombre de la regla" })).toBeTruthy();
      expect(component.root.findByProps({ placeholder: "Base (%)" })).toBeTruthy();
      expect(component.root.findByProps({ placeholder: "Transporte (%)" })).toBeTruthy();
      expect(component.root.findByProps({ placeholder: "Complejidad (%)" })).toBeTruthy();
      expect(component.root.findByProps({ placeholder: "Insumos (%)" })).toBeTruthy();
    });

    it("calls onClose when cancel button is pressed", () => {
      const component = renderer.create(
        <CreateRuleModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      );
      const cancelButton = component.root.findByProps({ children: "Cancelar" });
      act(() => {
        cancelButton.props.onPress();
      });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("shows loading state when submitting", async () => {
      const delayedSubmit = vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100)));
      const component = renderer.create(
        <CreateRuleModal
          visible={true}
          onSubmit={delayedSubmit}
          onClose={mockOnClose}
        />
      );
      const nameInput = component.root.findByProps({ placeholder: "Nombre de la regla" });
      const baseInput = component.root.findByProps({ placeholder: "Base (%)" });
      const transportInput = component.root.findByProps({ placeholder: "Transporte (%)" });
      const complexityInput = component.root.findByProps({ placeholder: "Complejidad (%)" });
      const suppliesInput = component.root.findByProps({ placeholder: "Insumos (%)" });
      act(() => {
        nameInput.props.onChangeText("Test Rule");
        baseInput.props.onChangeText("70");
        transportInput.props.onChangeText("10");
        complexityInput.props.onChangeText("15");
        suppliesInput.props.onChangeText("5");
      });
      const submitButton = component.root.findByProps({ children: "Guardar" });
      await act(async () => {
        submitButton.props.onPress();
      });
      expect(delayedSubmit).toHaveBeenCalled();
    });
  });
});