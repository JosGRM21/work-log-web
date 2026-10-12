import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';
import type { WorkItemSummary, WorkListResponse, WorkStatus } from '../../shared/types.js';

export interface UseWorksOptions {
    initialStatus?: WorkStatus | 'all';
    initialOrder?: 'desc' | 'asc';
    limit?: number;
}

export function useWorks(options: UseWorksOptions = {}) {
    const [works, setWorks] = useState<WorkItemSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>(options.initialStatus ?? 'all');
    const [order, setOrder] = useState<'desc' | 'asc'>(options.initialOrder ?? 'desc');

    const fetchWorks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            params.append('order', order);
            params.append('limit', String(options.limit ?? 50));
            params.append('offset', '0');

            const response = await apiClient.get<WorkListResponse>(`/works?${params.toString()}`);
            setWorks(response.data);
            setTotal(response.meta.total);
        } catch (err) {
            setError((err as Error).message || 'No fue posible cargar el catálogo de trabajos.');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, order, options.limit]);

    useEffect(() => {
        fetchWorks();
    }, [fetchWorks]);

    return {
        works,
        total,
        isLoading,
        error,
        statusFilter,
        setStatusFilter,
        order,
        setOrder,
        refetch: fetchWorks,
    };
}