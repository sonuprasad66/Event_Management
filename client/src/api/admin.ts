import apiClient from './client';
import type { AdminStats, ApiResponse, Event, User } from '../types';

export const adminApi = {
  stats: () => apiClient.get<ApiResponse<AdminStats>>('/admin/stats'),

  // Events
  events: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<Event[]>>('/admin/events', { params }),

  createEvent: (data: FormData) =>
    apiClient.post<ApiResponse<Event>>('/admin/events', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  softDelete: (id: string) => apiClient.delete<ApiResponse<Event>>(`/admin/events/${id}/soft`),

  permanentDelete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/admin/events/${id}/permanent`),

  restore: (id: string) => apiClient.patch<ApiResponse<Event>>(`/admin/events/${id}/restore`),

  // Users
  users: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<User[]>>('/admin/users', { params }),

  createUser: (data: {
    username: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'USER';
    timezone: string;
  }) => apiClient.post<ApiResponse<User>>('/admin/users', data),
};
