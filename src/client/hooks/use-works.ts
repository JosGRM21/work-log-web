import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';
import type { WorkItemSummary, WorkListResponse, WorkStatus } from '../../shared/types.js';

export interface UseWorksOptions {
  initialStatus?: WorkStatus | 'all';
  initialOrder?: 'desc' | 'asc';
  limit?: number;
}

export function useWorks(options: UseWorksOptions = {}) {
  const limit = options.limit ?? 18;
  const [works, setWorks] = useState<WorkItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilterState] = useState<WorkStatus | 'all'>(
    options.initialStatus ?? 'all',
  );
  const [order, setOrderState] = useState<'desc' | 'asc'>(options.initialOrder ?? 'desc');

  const setStatusFilter = useCallback((nextStatus: WorkStatus | 'all') => {
    setOffset(0);
    setStatusFilterState(nextStatus);
  }, []);

  const setOrder = useCallback((nextOrder: 'desc' | 'asc') => {
    setOffset(0);
    setOrderState(nextOrder);
  }, []);

  const fetchWorks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('order', order);
      params.append('limit', String(limit));
      params.append('offset', String(offset));

      const response = await apiClient.get<WorkListResponse>(`/works?${params.toString()}`);
      setWorks(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setError((err as Error).message || 'No fue posible cargar el catálogo de trabajos.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, order, limit, offset]);

  useEffect(() => {
    void fetchWorks();
  }, [fetchWorks]);

  return {
    works,
    total,
    limit,
    offset,
    setOffset,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    order,
    setOrder,
    refetch: fetchWorks,
  };
}
