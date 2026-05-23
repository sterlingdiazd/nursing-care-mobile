import React from "react";
import { describe, it, expect, vi } from "vitest";
import renderer, { act } from "react-test-renderer";

import { usePagedList, useClientPaging, type UsePagedListResult, type UseClientPagingResult } from "../usePagedList";

// Host components capture the latest hook result for assertions.
let pagedResult: UsePagedListResult<number> | undefined;
function PagedHost(props: Parameters<typeof usePagedList<number>>[0]) {
  pagedResult = usePagedList<number>(props);
  return null;
}

let clientResult: UseClientPagingResult<number> | undefined;
function ClientHost({ all, resetKey }: { all: number[]; resetKey?: unknown }) {
  clientResult = useClientPaging<number>(all, 10, resetKey);
  return null;
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe("usePagedList (server paging)", () => {
  it("loads page 1 on mount and exposes totalCount / pageCount", async () => {
    const fetcher = vi.fn(async (page: number) => ({
      items: Array.from({ length: 10 }, (_, i) => (page - 1) * 10 + i),
      totalCount: 25,
    }));
    await act(async () => {
      renderer.create(<PagedHost fetcher={fetcher} pageSize={10} enabled />);
      await flush();
    });
    expect(fetcher).toHaveBeenCalledWith(1, 10);
    expect(pagedResult?.totalCount).toBe(25);
    expect(pagedResult?.pageCount).toBe(3);
    expect(pagedResult?.items[0]).toBe(0);
  });

  it("setPage fetches the requested page", async () => {
    const fetcher = vi.fn(async (page: number) => ({
      items: Array.from({ length: 10 }, (_, i) => (page - 1) * 10 + i),
      totalCount: 25,
    }));
    await act(async () => {
      renderer.create(<PagedHost fetcher={fetcher} pageSize={10} enabled />);
      await flush();
    });
    await act(async () => {
      pagedResult?.setPage(2);
      await flush();
    });
    expect(fetcher).toHaveBeenLastCalledWith(2, 10);
    expect(pagedResult?.page).toBe(2);
    expect(pagedResult?.items[0]).toBe(10);
  });

  it("does not load while disabled", async () => {
    const fetcher = vi.fn(async () => ({ items: [], totalCount: 0 }));
    await act(async () => {
      renderer.create(<PagedHost fetcher={fetcher} pageSize={10} enabled={false} />);
      await flush();
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces fetch errors", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("boom");
    });
    await act(async () => {
      renderer.create(<PagedHost fetcher={fetcher} pageSize={10} enabled />);
      await flush();
    });
    expect(pagedResult?.error).toBe("boom");
  });
});

describe("useClientPaging", () => {
  it("slices to pageSize and computes pageCount", () => {
    const all = Array.from({ length: 23 }, (_, i) => i);
    act(() => {
      renderer.create(<ClientHost all={all} resetKey="a" />);
    });
    expect(clientResult?.pageCount).toBe(3);
    expect(clientResult?.pageItems).toHaveLength(10);
    expect(clientResult?.total).toBe(23);
  });

  it("clamps an out-of-range page", () => {
    const all = Array.from({ length: 5 }, (_, i) => i);
    let comp!: renderer.ReactTestRenderer;
    act(() => {
      comp = renderer.create(<ClientHost all={all} resetKey="a" />);
    });
    act(() => clientResult?.setPage(9));
    act(() => {
      comp.update(<ClientHost all={all} resetKey="a" />);
    });
    expect(clientResult?.page).toBe(1); // 5 items -> single page, clamped
  });
});
