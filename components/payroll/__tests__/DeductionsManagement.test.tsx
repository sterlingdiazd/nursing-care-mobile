import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import renderer from "react-test-renderer";
import { DeductionListItem } from "../DeductionListItem";
import { CreateDeductionModal } from "../CreateDeductionModal";

// Mock dependencies are already set up in setupTests.ts

describe("DeductionsManagement", () => {
  const mockDeduction = {
    id: "ded-1",
    nurseUserId: "nurse-1",
    nurseDisplayName: "María Rodríguez",
    payrollPeriodId: null,
    label: "Seguro Médico",
    amount: 1500,
    deductionType: "Fixed",
    createdAtUtc: "2024-01-01T00:00:00Z",
  };

  const mockOnDelete = vi.fn();
  const mockOnSubmit = vi.fn(() => Promise.resolve());
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DeductionListItem", () => {
    it("renders correctly", () => {
      const component = renderer.create(
        <DeductionListItem deduction={mockDeduction} onDelete={mockOnDelete} />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  describe("CreateDeductionModal", () => {
    it("renders correctly when visible", () => {
      const component = renderer.create(
        <CreateDeductionModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });

    it("renders correctly when not visible", () => {
      const component = renderer.create(
        <CreateDeductionModal
          visible={false}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });
});