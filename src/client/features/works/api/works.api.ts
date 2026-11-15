import { apiClient } from '@/api/client.js';
import type {
  WorkListResponse,
  WorkItemDetail,
  WorkStatus,
} from '@shared/types.js';

export interface ListWorksParams {
  limit?: number;
  offset?: number;
  status?: WorkStatus | 'all';
  area?: string | 'all';
  order?: 'asc' | 'desc';
}

export interface CreateWorkInput {
  title: string;
  area?: string | null;
  description?: string | null;
  status?: WorkStatus;
  reference_date?: string;
  start_date?: string | null;
  end_date?: string | null;
  next_maintenance_date?: string | null;
}

export interface UpdateWorkInput {
  title?: string;
  area?: string | null;
  description?: string | null;
  status?: WorkStatus;
  reference_date?: string;
  start_date?: string | null;
  end_date?: string | null;
  next_maintenance_date?: string | null;
}

export const worksApi = {
  list: (params: ListWorksParams = {}, signal?: AbortSignal, cache?: RequestCache) => {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.area && params.area !== 'all') query.set('area', params.area);
    if (params.order) query.set('order', params.order);

    const queryString = query.toString();
    const endpoint = queryString ? `/works?${queryString}` : '/works';
    return apiClient.get<WorkListResponse>(endpoint, {
      signal,
      ...(cache ? { cache } : {}),
    });
  },

  getById: (id: string, signal?: AbortSignal, cache?: RequestCache) =>
    apiClient.get<WorkItemDetail>(`/works/${id}`, {
      signal,
      ...(cache ? { cache } : {}),
    }),

  create: (data: CreateWorkInput) =>
    apiClient.post<{ id: string; title: string; area: string | null }>('/works', data),

  update: (id: string, data: UpdateWorkInput) =>
    apiClient.patch<{ id: string; title: string; area: string | null }>(`/works/${id}`, data),

  delete: (id: string) => apiClient.delete(`/works/${id}`),
};
