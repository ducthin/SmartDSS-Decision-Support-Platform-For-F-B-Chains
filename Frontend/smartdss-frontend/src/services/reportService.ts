import api from './api';
import type { ApiResponse, Sales, DailySalesReport, BestProduct } from '@/types';

export const salesService = {
  getAll: () => api.get<ApiResponse<Sales[]>>('/sales'),
  getById: (id: number) => api.get<ApiResponse<Sales>>(`/sales/${id}`),
};

export const reportService = {
  dailySales: (date?: string) =>
    api.get<ApiResponse<DailySalesReport[]>>('/reports/daily-sales', { params: { date } }),
  weeklySales: (date?: string) =>
    api.get<ApiResponse<DailySalesReport[]>>('/reports/weekly-sales', { params: { date } }),
  bestProducts: () =>
    api.get<ApiResponse<BestProduct[]>>('/reports/best-products'),
  lowStock: () =>
    api.get<ApiResponse<Inventory[]>>('/reports/low-stock'),
};

type Inventory = import('@/types').Inventory;
