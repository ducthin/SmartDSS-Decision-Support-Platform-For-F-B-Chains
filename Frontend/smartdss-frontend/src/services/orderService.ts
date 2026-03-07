import api from './api';
import type { ApiResponse, Order, OrderForm, PageResponse } from '@/types';

export const orderService = {
  getAll: (page = 0, size = 10, status?: string) =>
    api.get<ApiResponse<PageResponse<Order>>>('/orders', { params: { page, size, status: status || undefined } }),
  getById: (id: number) => api.get<ApiResponse<Order>>(`/orders/${id}`),
  create: (data: OrderForm) => api.post<ApiResponse<Order>>('/orders', data),
  updateStatus: (id: number, status: string) =>
    api.put<ApiResponse<Order>>(`/orders/${id}/status`, { status }),
};
