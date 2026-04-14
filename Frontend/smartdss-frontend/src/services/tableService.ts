import api from './api';
import type { ApiResponse, DiningTable, DiningTableForm, PageResponse } from '@/types';

export const tableService = {
  getAll: (page = 0, size = 12) => api.get<ApiResponse<PageResponse<DiningTable>>>(`/tables?page=${page}&size=${size}`),
  getById: (id: number) => api.get<ApiResponse<DiningTable>>(`/tables/${id}`),
  create: (data: DiningTableForm) => api.post<ApiResponse<DiningTable>>('/tables', data),
  update: (id: number, data: DiningTableForm) => api.put<ApiResponse<DiningTable>>(`/tables/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/tables/${id}`),
  regenerateQr: (id: number) => api.post<ApiResponse<DiningTable>>(`/tables/${id}/regenerate-qr`),
};
