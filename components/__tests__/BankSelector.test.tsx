import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";
import { BankSelector } from "../BankSelector";

// All react-native and expo mocks are provided by setupTests.ts + vitest.config.ts alias.

describe("BankSelector", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── helpers ──────────────────────────────────────────────────────────────────

  /** Returns the first instance in the tree whose props satisfy the predicate. */
  function findFirst(
    component: renderer.ReactTestRenderer,
    pred: (n: renderer.ReactTestInstance) => boolean,
  ): renderer.ReactTestInstance {
    const results = component.root.findAll(pred);
    if (results.length === 0) throw new Error("findFirst: no matching instance");
    return results[0];
  }

  // ── 1. Accent-insensitive search ─────────────────────────────────────────────
  it("accent-insensitive search: 'atlantico' matches Banco Atlántico and 'BHD' matches BHD León", () => {
    let component!: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <BankSelector value="" onChange={onChange} testID="bank" />,
      );
    });

    // PickerSearchInput spreads all props onto TextInput; find the first node
    // carrying testID="bank-search" and an onChangeText handler.
    const searchInput = findFirst(
      component,
      (n) => n.props.testID === "bank-search" && typeof n.props.onChangeText === "function",
    );

    // Type without accent; Banco Atlántico should appear in the filtered list.
    act(() => {
      searchInput.props.onChangeText("atlantico");
    });

    const atlanticoOpts = component.root.findAll(
      (n) => n.props.accessibilityLabel === "Seleccionar Banco Atlántico",
    );
    expect(atlanticoOpts.length).toBeGreaterThan(0);

    // Switch to BHD — stored as "BHD León" (with accent).
    act(() => {
      searchInput.props.onChangeText("BHD");
    });

    const bhdOpts = component.root.findAll(
      (n) => n.props.accessibilityLabel === "Seleccionar BHD León",
    );
    expect(bhdOpts.length).toBeGreaterThan(0);
  });

  // ── 2. Custom entry ───────────────────────────────────────────────────────────
  it("custom entry: query absent from DR_BANKS commits the trimmed value via onChange", () => {
    let component!: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <BankSelector value="" onChange={onChange} testID="bank" />,
      );
    });

    const searchInput = findFirst(
      component,
      (n) => n.props.testID === "bank-search" && typeof n.props.onChangeText === "function",
    );

    // Surrounding spaces to verify trimming.
    act(() => {
      searchInput.props.onChangeText("  Banco Privado  ");
    });

    // The custom-entry option must be present.
    const customOption = findFirst(
      component,
      (n) => n.props.testID === "bank-option-custom" && typeof n.props.onPress === "function",
    );
    expect(customOption).toBeTruthy();

    act(() => {
      customOption.props.onPress();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("Banco Privado");
  });

  // ── 3. Value preserved on close ───────────────────────────────────────────────
  it("dismissing the picker without selecting does not call onChange", () => {
    let component!: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <BankSelector value="" onChange={onChange} testID="bank" />,
      );
    });

    // The BankSelector component itself carries testID="bank" as a prop, so we
    // must narrow to the interactive trigger (the SelectRow) which also has onPress.
    const trigger = findFirst(
      component,
      (n) => n.props.testID === "bank" && typeof n.props.onPress === "function",
    );
    act(() => {
      trigger.props.onPress();
    });

    // Close via the sheet close button (backdrop or header button, both labelled "Cerrar selector").
    const closeButtons = component.root.findAll(
      (n) => n.props.accessibilityLabel === "Cerrar selector" && typeof n.props.onPress === "function",
    );
    expect(closeButtons.length).toBeGreaterThan(0);

    act(() => {
      closeButtons[0].props.onPress();
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  // ── 4. Disabled ───────────────────────────────────────────────────────────────
  it("disabled prop makes the trigger non-interactive and onChange never fires", () => {
    let component!: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <BankSelector value="" onChange={onChange} disabled testID="bank" />,
      );
    });

    // The SelectRow trigger (and the inner TouchableOpacity) must carry disabled=true.
    const disabledNodes = component.root.findAll(
      (n) => n.props.testID === "bank" && n.props.disabled === true,
    );
    expect(disabledNodes.length).toBeGreaterThan(0);

    // Even if onPress is invoked, handleOpen guards on the disabled flag and returns early.
    const trigger = findFirst(
      component,
      (n) => n.props.testID === "bank" && typeof n.props.onPress === "function",
    );
    act(() => {
      trigger.props.onPress();
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  // ── 5. errorMessage ───────────────────────────────────────────────────────────
  it("errorMessage renders below the trigger when the prop is set", () => {
    let component!: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <BankSelector value="" onChange={onChange} errorMessage="Campo requerido" />,
      );
    });

    const allTexts = component.root.findAllByType(Text);
    const errorNode = allTexts.find((n) => {
      const c = n.props.children;
      return typeof c === "string" && c === "Campo requerido";
    });
    expect(errorNode).toBeTruthy();
  });

  // ── 6. isCustomEntry hint ─────────────────────────────────────────────────────
  it("shows the custom-entry hint when the current value is not found in DR_BANKS", () => {
    let component!: renderer.ReactTestRenderer;
    act(() => {
      component = renderer.create(
        <BankSelector value="Banco Imaginario S.A." onChange={onChange} />,
      );
    });

    const allTexts = component.root.findAllByType(Text);
    const hintNode = allTexts.find((n) => {
      const c = n.props.children;
      return typeof c === "string" && c.includes("Banco no encontrado");
    });
    expect(hintNode).toBeTruthy();
  });
});
