import apiClient from './client';
import type { ApiResponse, Event } from '../types';

export const eventsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<Event[]>>('/events', { params }),

  getById: (id: string) => apiClient.get<ApiResponse<Event>>(`/events/${id}`),

  create: (data: FormData) =>
    apiClient.post<ApiResponse<Event>>('/events', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ id: string; deletedAt: string }>>(`/events/${id}`),
};
