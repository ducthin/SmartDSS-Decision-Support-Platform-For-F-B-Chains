import api from './api';
import type { ApiResponse, DiningTable, DiningTableForm } from '@/types';

export const tableService = {
  getAll: () => api.get<ApiResponse<DiningTable[]>>('/tables'),
  getById: (id: number) => api.get<ApiResponse<DiningTable>>(`/tables/${id}`),
  create: (data: DiningTableForm) => api.post<ApiResponse<DiningTable>>('/tables', data),
  update: (id: number, data: DiningTableForm) => api.put<ApiResponse<DiningTable>>(`/tables/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/tables/${id}`),
  regenerateQr: (id: number) => api.post<ApiResponse<DiningTable>>(`/tables/${id}/regenerate-qr`),
};
