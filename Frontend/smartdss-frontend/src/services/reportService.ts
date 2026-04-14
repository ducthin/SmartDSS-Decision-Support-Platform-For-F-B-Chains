import api from './api';
import type {
  ApiResponse,
  Sales,
  DailySalesReport,
  BestProduct,
  TaxReportResponse,
  MlTrainingDataQuality,
} from '@/types';

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
  trainingDataQuality: (fromDate?: string, toDate?: string, areaDensityScore?: number) =>
    api.get<ApiResponse<MlTrainingDataQuality>>('/reports/ml-training-data/quality', {
      params: { fromDate, toDate, areaDensityScore },
    }),
  downloadMlTrainingCsv: (fromDate?: string, toDate?: string, areaDensityScore?: number) =>
    api.get<Blob>('/reports/ml-training-data.csv', {
      params: { fromDate, toDate, areaDensityScore },
      responseType: 'blob',
      timeout: 120000,
    }),
};

type Inventory = import('@/types').Inventory;
