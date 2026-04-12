import api from './api';
import type {
  ApiResponse,
  PaymentInit,
  PaymentStatus,
  TableCashSettlementResult,
  TableQrInit,
  TableSettlementSummary,
} from '@/types';

export const paymentService = {
  initQr: (orderId: number) => api.post<ApiResponse<PaymentInit>>(`/payments/orders/${orderId}/qr`),
  initTableQr: (tableNumber: string) => api.post<ApiResponse<TableQrInit>>('/payments/tables/qr', null, {
    params: { tableNumber },
  }),
  markCashPaid: (orderId: number) => api.post<ApiResponse<PaymentStatus>>(`/payments/orders/${orderId}/cash`),
  markTableCashPaid: (tableNumber: string) => api.post<ApiResponse<TableCashSettlementResult>>('/payments/tables/cash', null, {
    params: { tableNumber },
  }),
  getStatus: (orderId: number) => api.get<ApiResponse<PaymentStatus>>(`/payments/orders/${orderId}/status`),
  getTableSettlementSummary: () => api.get<ApiResponse<TableSettlementSummary[]>>('/payments/tables/settlement-summary'),
  getStatuses: (orderIds: number[]) => api.get<ApiResponse<PaymentStatus[]>>('/payments/orders/statuses', {
    params: { orderIds },
    paramsSerializer: {
      indexes: null,
    },
  }),
};
