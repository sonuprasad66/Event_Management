import apiClient from './client';
import type { ApiResponse, Category } from '../types';

export const categoriesApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<Category[]>>('/categories', { params }),

  tree: () => apiClient.get<ApiResponse<Category[]>>('/categories/tree'),

  create: (data: { name: string; parentId?: string | null }) =>
    apiClient.post<ApiResponse<Category>>('/categories', data),

  update: (id: string, data: { name?: string; parentId?: string | null }) =>
    apiClient.patch<ApiResponse<Category>>(`/categories/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<null>>(`/categories/${id}`),
};
