import api from './api';
import type { ApiResponse, PageResponse, Voucher, VoucherForm } from '@/types';

export const voucherService = {
  getAll: (page = 0, size = 20, keyword?: string) =>
    api.get<ApiResponse<PageResponse<Voucher>>>('/vouchers', { params: { page, size, keyword: keyword || undefined } }),
  getAvailableForPhone: (phone: string) =>
    api.get<ApiResponse<Voucher[]>>('/vouchers/available', { params: { phone } }),
  getById: (id: number) => api.get<ApiResponse<Voucher>>(`/vouchers/${id}`),
  create: (data: VoucherForm) => api.post<ApiResponse<Voucher>>('/vouchers', data),
  update: (id: number, data: VoucherForm) => api.put<ApiResponse<Voucher>>(`/vouchers/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/vouchers/${id}`),
};
