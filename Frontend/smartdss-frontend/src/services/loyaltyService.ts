import api from './api';
import type { ApiResponse, LoyaltyAccount, LoyaltyTier, LoyaltyTierPolicy } from '@/types';

export const loyaltyService = {
  getAll: () => api.get<ApiResponse<LoyaltyAccount[]>>('/loyalty/accounts'),
  getByPhone: (phone: string) => api.get<ApiResponse<LoyaltyAccount>>(`/loyalty/accounts/${encodeURIComponent(phone)}`),
  getTiers: () => api.get<ApiResponse<LoyaltyTier[]>>('/loyalty/tiers'),
  updateTiers: (data: LoyaltyTier[]) => api.put<ApiResponse<LoyaltyTier[]>>('/loyalty/tiers', data),
  getTierPolicy: () => api.get<ApiResponse<LoyaltyTierPolicy>>('/loyalty/tier-policy'),
  updateTierPolicy: (data: LoyaltyTierPolicy) => api.put<ApiResponse<LoyaltyTierPolicy>>('/loyalty/tier-policy', data),
};
