import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Page-jump pagination (numbered chips, PAGE_SIZE=10, reset-to-1 on filter change).
 *
 * This is distinct from `usePaginatedList`, which is an infinite-scroll
 * (load-more / append) hook. Admin lists follow the numbered-pager UX, so they
 * use this hook plus the shared <Pagination/> component. Two flavors:
 *   - `usePagedList`   — server-side paging (fetcher returns one page + totalCount).
 *   - `useClientPaging` — slice a fully-fetched array to 10 rows per page.
 */

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
}

interface UsePagedListArgs<T> {
  fetcher: (page: number, pageSize: number) => Promise<PagedResponse<T>>;
  pageSize?: number;
  /** Gate loading until auth/readiness is satisfied. */
  enabled?: boolean;
  /** When this value changes (e.g. the active filter), reload from page 1. */
  resetKey?: unknown;
  errorMessage?: string;
}

export interface UsePagedListResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  setPage: (page: number) => void;
  refresh: () => void;
  reload: () => void;
}

export function usePagedList<T>({
  fetcher,
  pageSize = 10,
  enabled = true,
  resetKey,
  errorMessage = "No fue posible cargar los datos.",
}: UsePagedListArgs<T>): UsePagedListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPageState] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest fetcher without making it an effect dependency (callers
  // commonly pass an inline closure that changes identity every render).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const reqId = useRef(0);

  const load = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "navigate") => {
      const id = ++reqId.current;
      setError(null);
      if (mode === "refresh") setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const res = await fetcherRef.current(nextPage, pageSize);
        if (id !== reqId.current) return; // a newer request superseded this one
        setItems(res.items);
        setTotalCount(res.totalCount);
        setPageState(nextPage);
      } catch (e) {
        if (id !== reqId.current) return;
        setError(e instanceof Error ? e.message : errorMessage);
      } finally {
        if (id === reqId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [pageSize, errorMessage],
  );

  useEffect(() => {
    if (!enabled) return;
    void load(1, "initial");
    // Reload from page 1 when enabled flips true or the filter (resetKey) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resetKey]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const setPage = useCallback(
    (p: number) => {
      if (p < 1 || p > pageCount || p === page) return;
      void load(p, "navigate");
    },
    [load, page, pageCount],
  );

  const refresh = useCallback(() => void load(page, "refresh"), [load, page]);
  const reload = useCallback(() => void load(1, "initial"), [load]);

  return { items, totalCount, page, pageCount, isLoading, isRefreshing, error, setPage, refresh, reload };
}

export interface UseClientPagingResult<T> {
  page: number;
  pageCount: number;
  pageItems: T[];
  total: number;
  setPage: (page: number) => void;
}

/**
 * Client-side numbered paging for bounded lists already fetched in full
 * (catalog tabs, per-period deductions/adjustments). Resets to page 1 whenever
 * `resetKey` changes (e.g. a tab/filter switch).
 */
export function useClientPaging<T>(all: T[], pageSize = 10, resetKey?: unknown): UseClientPagingResult<T> {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  const pageItems = all.slice(start, start + pageSize);

  return { page: safePage, pageCount, pageItems, total: all.length, setPage };
}
