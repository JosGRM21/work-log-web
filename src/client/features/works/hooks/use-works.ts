import { useState, useEffect, useCallback, useRef } from 'react';
import { worksApi } from '../api/works.api.js';
import type {
  WorkItemSummary,
  WorkItemDetail,
  WorkStatus,
  WorkListSummary,
  WorkListFilteredSummary,
} from '@shared/types.js';

export interface UseWorksOptions {
  initialStatus?: WorkStatus | 'all';
  initialArea?: string | 'all';
  initialOrder?: 'desc' | 'asc';
  limit?: number;
}

interface CachedResponse {
  data: WorkItemSummary[];
  total: number;
  summary?: WorkListSummary;
  filteredSummary?: WorkListFilteredSummary;
  areas?: string[];
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 1000; // 1 minuto de validez fresca
const API_MAX_LIMIT = 100;
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
  const pagedLimit = options.limit ?? 18;
  const [works, setWorks] = useState<WorkItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<WorkListSummary | undefined>(undefined);
  const [filteredSummary, setFilteredSummary] = useState<WorkListFilteredSummary | undefined>(
    undefined,
  );
  const [areas, setAreas] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilterState] = useState<WorkStatus | 'all'>(
    options.initialStatus ?? 'all',
  );
  const [areaFilter, setAreaFilterState] = useState<string | 'all'>(
    options.initialArea ?? 'all',
  );
  const [order, setOrderState] = useState<'desc' | 'asc'>(options.initialOrder ?? 'desc');

  const isGroupedByArea = areaFilter === 'all';
  const limit = isGroupedByArea ? API_MAX_LIMIT : pagedLimit;
  const effectiveOffset = isGroupedByArea ? 0 : offset;

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

  const setAreaFilter = useCallback((nextArea: string | 'all') => {
    setOffset(0);
    setAreaFilterState(nextArea);
  }, []);

  const setOrder = useCallback((nextOrder: 'desc' | 'asc') => {
    setOffset(0);
    setOrderState(nextOrder);
  }, []);

  const fetchWorks = useCallback(
    async (bypassCache = false) => {
      const cacheKey = `${statusFilter}:${areaFilter}:${order}:${limit}:${effectiveOffset}`;
      const cached = catalogCache.get(cacheKey);
      const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS;

      // Si tenemos datos en caché, renderizarlos inmediatamente sin parpadeo
      if (cached && !bypassCache) {
        setWorks(cached.data);
        setTotal(cached.total);
        if (cached.summary) {
          setSummary(cached.summary);
        }
        setFilteredSummary(cached.filteredSummary);
        if (cached.areas) {
          setAreas(cached.areas);
        }
        setIsLoading(false);
        setError(null);

        // Si la caché está fresca, abortar cualquier petición previa en vuelo y retornar
        if (isFresh) {
          abortControllerRef.current?.abort();
          abortControllerRef.current = null;
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
        const cacheMode = bypassCache ? 'no-store' : undefined;
        const response = await worksApi.list(
          {
            status: statusFilter,
            area: areaFilter,
            order,
            limit,
            offset: effectiveOffset,
          },
          abortController.signal,
          cacheMode,
        );

        let fullData = response.data;
        if (isGroupedByArea && response.meta.total > response.data.length) {
          const remainingOffsets: number[] = [];
          for (let nextOffset = API_MAX_LIMIT; nextOffset < response.meta.total; nextOffset += API_MAX_LIMIT) {
            remainingOffsets.push(nextOffset);
          }
          const extraPages = await Promise.all(
            remainingOffsets.map((nextOffset) =>
              worksApi.list(
                {
                  status: statusFilter,
                  area: areaFilter,
                  order,
                  limit: API_MAX_LIMIT,
                  offset: nextOffset,
                },
                abortController.signal,
                cacheMode,
              ),
            ),
          );
          fullData = [...response.data, ...extraPages.flatMap((page) => page.data)];
        }

        if (!isGroupedByArea && fullData.length === 0 && response.meta.total > 0 && effectiveOffset > 0) {
          const fallbackOffset = Math.max(0, Math.floor((response.meta.total - 1) / limit) * limit);
          setOffset(fallbackOffset);
          return;
        }

        catalogCache.set(cacheKey, {
          data: fullData,
          total: response.meta.total,
          summary: response.meta.summary,
          filteredSummary: response.meta.filtered_summary,
          areas: response.meta.areas,
          timestamp: Date.now(),
        });
        setWorks(fullData);
        setTotal(response.meta.total);
        if (response.meta.summary) {
          setSummary(response.meta.summary);
        }
        setFilteredSummary(response.meta.filtered_summary);
        if (response.meta.areas) {
          setAreas(response.meta.areas);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
        setError((err as Error).message || 'No fue posible cargar el catálogo de trabajos.');
      } finally {
        if (abortControllerRef.current === abortController) {
          setIsLoading(false);
        }
      }
    },
    [statusFilter, areaFilter, order, limit, effectiveOffset, isGroupedByArea],
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
    filteredSummary,
    areas,
    limit,
    offset,
    setOffset,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    areaFilter,
    setAreaFilter,
    order,
    setOrder,
    refetch,
  };
}

