import { useCallback, useEffect, useRef, useState } from "react";
import { isConnectivityError } from "@/src/services/httpClient";
import { readSnapshot, writeSnapshot } from "@/src/services/apiSnapshotCache";

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export interface UsePaginatedListOptions {
  pageSize?: number;
  autoLoad?: boolean;
  /**
   * If set, the first page result is cached in AsyncStorage under this
   * bucket key on every successful load. If a subsequent fetch fails with
   * a connectivity error, the hook serves the cached items instead of an
   * empty list and sets `isStale: true` so the screen can render an
   * offline banner. Each bucket should be unique per screen+role+filter.
   */
  cacheBucket?: string;
}

export interface UsePaginatedListResult<T> {
  data: T[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  error: string | null;
  /** True when `data` came from the snapshot cache after a connectivity failure. */
  isStale: boolean;
  /** ISO timestamp the cached snapshot was captured, when `isStale` is true. */
  staleCapturedAtUtc: string | null;
}

interface CachedListEnvelope<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export function usePaginatedList<T>(
  fetchFn: (page: number, pageSize: number) => Promise<PaginatedResult<T>>,
  options?: UsePaginatedListOptions,
): UsePaginatedListResult<T> {
  const pageSize = options?.pageSize ?? 20;
  const autoLoad = options?.autoLoad ?? true;
  const cacheBucket = options?.cacheBucket;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [staleCapturedAtUtc, setStaleCapturedAtUtc] = useState<string | null>(null);

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
        setIsStale(false);
        setStaleCapturedAtUtc(null);

        // Cache the first-page payload so future connectivity failures can
        // serve it instead of an empty list.
        if (cacheBucket && page === 1) {
          const envelope: CachedListEnvelope<T> = {
            items: result.items,
            totalCount: result.totalCount,
            hasMore: result.hasMore,
          };
          void writeSnapshot<CachedListEnvelope<T>>(cacheBucket, envelope);
        }
      } catch (err: any) {
        if (controller.signal.aborted) {
          return;
        }

        // Connectivity-error fallback: serve the cached snapshot if any.
        // The HTTP client has already kicked off a self-heal probe, so the
        // next refresh attempt may succeed automatically.
        if (cacheBucket && page === 1 && isConnectivityError(err)) {
          const cached = await readSnapshot<CachedListEnvelope<T>>(cacheBucket);
          if (cached) {
            setData(cached.data.items);
            setHasMore(cached.data.hasMore);
            setIsStale(true);
            setStaleCapturedAtUtc(cached.capturedAtUtc);
            setError(null);
            return;
          }
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
    [fetchFn, pageSize, cacheBucket],
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

  return {
    data,
    isLoading,
    isRefreshing,
    hasMore,
    loadMore,
    refresh,
    error,
    isStale,
    staleCapturedAtUtc,
  };
}
