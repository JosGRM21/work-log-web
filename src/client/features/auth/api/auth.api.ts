import { apiClient } from '@/api/client.js';
import type { UserSummary } from '@shared/types.js';

export interface LoginResponse {
  message: string;
  user: UserSummary;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: UserSummary | null;
}

export const authApi = {
  login: (identifier: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { identifier, password }),

  logout: () => apiClient.post<{ message: string }>('/auth/logout'),

  me: () => apiClient.get<AuthMeResponse>('/auth/me'),
};
