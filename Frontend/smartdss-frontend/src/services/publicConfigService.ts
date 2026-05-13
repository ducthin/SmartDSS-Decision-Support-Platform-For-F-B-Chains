import axios from 'axios';
import type { ApiResponse, TaxPolicy } from '@/types';

const publicApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/public/config`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export const publicConfigService = {
  getTaxPolicy: () => publicApi.get<ApiResponse<TaxPolicy>>('/tax'),
  getPaymentBankConfig: () => publicApi.get<ApiResponse<{ bankBin: string; bankAccount: string; bankAccountName: string }>>('/payments/bank'),
};
