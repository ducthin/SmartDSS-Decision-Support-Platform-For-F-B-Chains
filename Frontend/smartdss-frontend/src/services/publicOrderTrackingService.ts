import api from './api';
import type { ApiResponse, OrderTrackingDTO } from '@/types';

// Note: `api` baseURL already includes `/api/v1`
const BASE_PATH = '/public/orders';

export const publicOrderTrackingService = {
  trackByCustomerPhone: (customerPhone: string) =>
    api.get<ApiResponse<OrderTrackingDTO[]>>(`${BASE_PATH}/track`, {
      params: { customerPhone },
    }),
};

