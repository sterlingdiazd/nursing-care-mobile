import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import renderer from "react-test-renderer";
import { AdjustmentListItem } from "../AdjustmentListItem";
import { CreateAdjustmentModal } from "../CreateAdjustmentModal";

// Mock dependencies are already set up in setupTests.ts

describe("AdjustmentsManagement", () => {
  const mockAdjustment = {
    id: "adj-1",
    serviceExecutionId: "exec-1",
    label: "Bono por Productividad",
    amount: 2500,
    nurseDisplayName: "María Rodríguez",
    createdAtUtc: "2024-01-15T10:30:00Z",
  };

  const mockOnDelete = vi.fn();
  const mockOnSubmit = vi.fn(() => Promise.resolve());
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdjustmentListItem", () => {
    it("renders correctly with positive amount", () => {
      const component = renderer.create(
        <AdjustmentListItem adjustment={mockAdjustment} onDelete={mockOnDelete} />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });

    it("renders correctly with negative amount", () => {
      const negativeAdjustment = { ...mockAdjustment, amount: -1000, label: "Descuento" };
      const component = renderer.create(
        <AdjustmentListItem adjustment={negativeAdjustment} onDelete={mockOnDelete} />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  describe("CreateAdjustmentModal", () => {
    it("renders correctly when visible", () => {
      const component = renderer.create(
        <CreateAdjustmentModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });

    it("renders correctly when not visible", () => {
      const component = renderer.create(
        <CreateAdjustmentModal
          visible={false}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });
});