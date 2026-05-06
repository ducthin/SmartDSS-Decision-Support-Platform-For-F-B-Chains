import api from './api';
import type { ApiResponse, PaymentInit, PaymentStatus } from '@/types';

// `api` đã có baseURL là `${VITE_API_URL}/api/v1`, nên không được viết thêm `/api/v1` ở đây.
const BASE_PATH = '/public/payments';

export const publicPaymentService = {
  initQrPayment: (orderId: number) =>
    api.post<ApiResponse<PaymentInit>>(`${BASE_PATH}/orders/${orderId}/qr`, null),

  getOrderPaymentStatus: (orderId: number) =>
    api.get<ApiResponse<PaymentStatus>>(`${BASE_PATH}/orders/${orderId}/status`),
};

