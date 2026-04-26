import api from './api';
import type { ApiResponse, LoyaltyAccount } from '@/types';

export const loyaltyService = {
  getAll: () => api.get<ApiResponse<LoyaltyAccount[]>>('/loyalty/accounts'),
  getByPhone: (phone: string) => api.get<ApiResponse<LoyaltyAccount>>(`/loyalty/accounts/${encodeURIComponent(phone)}`),
};
