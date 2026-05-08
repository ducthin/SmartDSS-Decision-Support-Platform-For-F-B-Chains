import api from './api';
import type { ApiResponse, Order, OrderForm, PageResponse, QrDiscountPreview } from '@/types';

export const orderService = {
  getAll: (page = 0, size = 10, status?: string, keyword?: string, source?: string) =>
    api.get<ApiResponse<PageResponse<Order>>>('/orders', { params: { page, size, status: status || undefined, keyword: keyword || undefined, source: source || undefined } }),
  getById: (id: number) => api.get<ApiResponse<Order>>(`/orders/${id}`),
  create: (data: OrderForm) => api.post<ApiResponse<Order>>('/orders', data),
  previewDiscount: (params: { subtotal: number; voucherCode?: string; customerPhone?: string }) =>
    api.get<ApiResponse<QrDiscountPreview>>('/orders/discount-preview', { params }),
  updateStatus: (id: number, status: string) =>
    api.put<ApiResponse<Order>>(`/orders/${id}/status`, { status }),
};
