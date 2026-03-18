import api from './api';
import type { ApiResponse, Sales, DailySalesReport, BestProduct, TaxReportResponse } from '@/types';

export const salesService = {
  getAll: () => api.get<ApiResponse<Sales[]>>('/sales'),
  getById: (id: number) => api.get<ApiResponse<Sales>>(`/sales/${id}`),
};

export const reportService = {
  dailySales: (date?: string) =>
    api.get<ApiResponse<DailySalesReport[]>>('/reports/daily-sales', { params: { date } }),
  hourlySales: (date?: string) =>
    api.get<ApiResponse<DailySalesReport[]>>('/reports/hourly-sales', { params: { date } }),
  weeklySales: (date?: string) =>
    api.get<ApiResponse<DailySalesReport[]>>('/reports/weekly-sales', { params: { date } }),
  bestProducts: () =>
    api.get<ApiResponse<BestProduct[]>>('/reports/best-products'),
  lowStock: () =>
    api.get<ApiResponse<Inventory[]>>('/reports/low-stock'),
  taxReport: (fromDate?: string, toDate?: string) =>
    api.get<ApiResponse<TaxReportResponse>>('/reports/tax', { params: { fromDate, toDate } }),
};

type Inventory = import('@/types').Inventory;
