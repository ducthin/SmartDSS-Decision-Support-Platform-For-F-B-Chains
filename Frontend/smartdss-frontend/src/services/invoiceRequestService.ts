import api from './api';
import type { ApiResponse, QrInvoiceResponse } from '@/types';

export const invoiceRequestService = {
  getAll: (size = 50) =>
    api.get<ApiResponse<QrInvoiceResponse[]>>('/invoice-requests', { params: { size } }),
  getPdf: (id: number) =>
    api.get<Blob>(`/invoice-requests/${id}/pdf`, { responseType: 'blob' }),
};
