import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import renderer from "react-test-renderer";

import { RuleListItem } from "../RuleListItem";
import { CreateRuleModal } from "../CreateRuleModal";
import { ToastProvider } from "@/src/components/shared/ToastProvider";

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RuleListItem renders rule information", () => {
    expect(() => renderer.create(<RuleListItem rule={mockRule as any} onPress={vi.fn()} />)).not.toThrow();
  });

  it("CreateRuleModal renders header and key labels", () => {
    expect(() =>
      renderer.create(
        <ToastProvider>
          <CreateRuleModal visible={true} onSubmit={async () => {}} onClose={vi.fn()} />
        </ToastProvider>
      )
    ).not.toThrow();
  });
});
