import apiClient from './client';
import type { ApiResponse, Session, User } from '../types';

export const authApi = {
  login: (data: { username: string; password: string }) =>
    apiClient.post<ApiResponse<{ token: string; user: User }>>('/auth/login', data),

  logout: () => apiClient.post<ApiResponse<null>>('/auth/logout'),

  me: () =>
    apiClient.get<ApiResponse<{ user: User; session: Session }>>('/auth/me'),
};
