import api from './api';
import type { ApiResponse, PaymentInit, PaymentStatus } from '@/types';

export const paymentService = {
  initQr: (orderId: number) => api.post<ApiResponse<PaymentInit>>(`/payments/orders/${orderId}/qr`),
  markCashPaid: (orderId: number) => api.post<ApiResponse<PaymentStatus>>(`/payments/orders/${orderId}/cash`),
  getStatus: (orderId: number) => api.get<ApiResponse<PaymentStatus>>(`/payments/orders/${orderId}/status`),
  getStatuses: (orderIds: number[]) => api.get<ApiResponse<PaymentStatus[]>>('/payments/orders/statuses', {
    params: { orderIds },
    paramsSerializer: {
      indexes: null,
    },
  }),
};
