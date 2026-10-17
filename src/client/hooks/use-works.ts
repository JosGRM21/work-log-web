import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client.js';
import type {
  WorkItemSummary,
  WorkItemDetail,
  WorkListResponse,
  WorkStatus,
  WorkListSummary,
} from '../../shared/types.js';

export interface UseWorksOptions {
  initialStatus?: WorkStatus | 'all';
  initialOrder?: 'desc' | 'asc';
  limit?: number;
}

interface CachedResponse {
  data: WorkItemSummary[];
  total: number;
  summary?: WorkListSummary;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 1000; // 1 minuto de validez fresca
const catalogCache = new Map<string, CachedResponse>();
const detailCache = new Map<string, WorkItemDetail>();

export function getCachedWorkDetail(id: string): WorkItemDetail | undefined {
  return detailCache.get(id);
}

export function setCachedWorkDetail(id: string, detail: WorkItemDetail): void {
  detailCache.set(id, detail);
}

export function invalidateWorkDetailCache(id?: string): void {
  if (id) {
    detailCache.delete(id);
  } else {
    detailCache.clear();
  }
}

export function clearWorksCache(): void {
  catalogCache.clear();
  detailCache.clear();
}

export function useWorks(options: UseWorksOptions = {}) {
  const limit = options.limit ?? 18;
  const [works, setWorks] = useState<WorkItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<WorkListSummary | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilterState] = useState<WorkStatus | 'all'>(
    options.initialStatus ?? 'all',
  );
  const [order, setOrderState] = useState<'desc' | 'asc'>(options.initialOrder ?? 'desc');

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const setStatusFilter = useCallback((nextStatus: WorkStatus | 'all') => {
    setOffset(0);
    setStatusFilterState(nextStatus);
  }, []);

  const setOrder = useCallback((nextOrder: 'desc' | 'asc') => {
    setOffset(0);
    setOrderState(nextOrder);
  }, []);

  const fetchWorks = useCallback(
    async (bypassCache = false) => {
      const cacheKey = `${statusFilter}:${order}:${limit}:${offset}`;
      const cached = catalogCache.get(cacheKey);
      const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS;

      // Si tenemos datos en caché, renderizarlos inmediatamente sin parpadeo
      if (cached && !bypassCache) {
        setWorks(cached.data);
        setTotal(cached.total);
        if (cached.summary) {
          setSummary(cached.summary);
        }
        setIsLoading(false);
        setError(null);

        // Si la caché está fresca, no necesitamos llamada a red
        if (isFresh) {
          return;
        }
      } else {
        setIsLoading(true);
      }

      setError(null);

      // Abortar cualquier solicitud previa en curso
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        params.append('order', order);
        params.append('limit', String(limit));
        params.append('offset', String(offset));

        const response = await apiClient.get<WorkListResponse>(
          `/works?${params.toString()}`,
          { signal: abortController.signal },
        );

        catalogCache.set(cacheKey, {
          data: response.data,
          total: response.meta.total,
          summary: response.meta.summary,
          timestamp: Date.now(),
        });
        setWorks(response.data);
        setTotal(response.meta.total);
        if (response.meta.summary) {
          setSummary(response.meta.summary);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
        // Si falló pero teníamos caché previa, no sobreescribir la UI
        if (!cached) {
          setError((err as Error).message || 'No fue posible cargar el catálogo de trabajos.');
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          setIsLoading(false);
        }
      }
    },
    [statusFilter, order, limit, offset],
  );

  useEffect(() => {
    void fetchWorks();
  }, [fetchWorks]);

  const refetch = useCallback(
    async (invalidateCache = true) => {
      if (invalidateCache) {
        catalogCache.clear();
      }
      await fetchWorks(invalidateCache);
    },
    [fetchWorks],
  );

  return {
    works,
    total,
    summary,
    limit,
    offset,
    setOffset,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    order,
    setOrder,
    refetch,
  };
}

