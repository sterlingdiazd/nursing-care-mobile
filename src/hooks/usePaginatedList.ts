import { useCallback, useEffect, useRef, useState } from "react";

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export interface UsePaginatedListOptions {
  pageSize?: number;
  autoLoad?: boolean;
}

export interface UsePaginatedListResult<T> {
  data: T[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  error: string | null;
}

export function usePaginatedList<T>(
  fetchFn: (page: number, pageSize: number) => Promise<PaginatedResult<T>>,
  options?: UsePaginatedListOptions,
): UsePaginatedListResult<T> {
  const pageSize = options?.pageSize ?? 20;
  const autoLoad = options?.autoLoad ?? true;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(1);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (page: number, isRefresh: boolean) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetchFn(page, pageSize);

        if (controller.signal.aborted) {
          return;
        }

        if (isRefresh) {
          setData(result.items);
          pageRef.current = 1;
        } else {
          setData((prev) => (page === 1 ? result.items : [...prev, ...result.items]));
        }

        setHasMore(result.hasMore);
      } catch (err: any) {
        if (controller.signal.aborted) {
          return;
        }
        setError(err?.message ?? "No fue posible cargar los datos.");
        setHasMore(false);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [fetchFn, pageSize],
  );

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || !hasMore) {
      return;
    }
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    void fetchPage(nextPage, false);
  }, [isLoading, isRefreshing, hasMore, fetchPage]);

  const refresh = useCallback(() => {
    pageRef.current = 1;
    void fetchPage(1, true);
  }, [fetchPage]);

  useEffect(() => {
    if (autoLoad) {
      pageRef.current = 1;
      void fetchPage(1, false);
    }

    return () => {
      abortControllerRef.current?.abort();
    };
    // Only run on mount and when fetchFn/pageSize/autoLoad change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLoading, isRefreshing, hasMore, loadMore, refresh, error };
}
