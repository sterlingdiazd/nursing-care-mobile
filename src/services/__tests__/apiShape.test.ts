import { describe, it, expect } from "vitest";
import { asArray } from "../apiShape";

// Locks the service-boundary list normalization that prevents the contract-drift crash class
// (bare-array endpoints silently becoming paginated envelopes -> "X.filter is not a function").
describe("asArray — list-shape normalization", () => {
  it("passes a bare array through unchanged", () => {
    expect(asArray<number>([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("unwraps a paginated envelope { items, totalCount, ... }", () => {
    expect(asArray<number>({ items: [1, 2], totalCount: 2, page: 1, pageSize: 10 })).toEqual([1, 2]);
  });

  it("unwraps { data: [...] }", () => {
    expect(asArray<string>({ data: ["a"] })).toEqual(["a"]);
  });

  it("unwraps { data: { items: [...] } }", () => {
    expect(asArray<number>({ data: { items: [9] } })).toEqual([9]);
  });

  it("returns [] for null / undefined / object without a list (never throws)", () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
    expect(asArray({ foo: "bar" })).toEqual([]);
    expect(asArray("oops")).toEqual([]);
  });
});
