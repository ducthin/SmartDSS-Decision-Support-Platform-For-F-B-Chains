import axios from 'axios';
import type { ApiResponse, CustomerFeedback, DiningTable, MenuItem, Order, QrFeedbackForm, QrInvoiceRequest, QrInvoiceResponse, QrOrderForm, QrStaffCallForm, StaffCall } from '@/types';

const qrApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/public/qr`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export const qrService = {
  getTableInfo: (token: string) =>
    qrApi.get<ApiResponse<DiningTable>>(`/${token}/info`),
  getMenu: (token: string) =>
    qrApi.get<ApiResponse<MenuItem[]>>(`/${token}/menu`),
  placeOrder: (token: string, data: QrOrderForm) =>
    qrApi.post<ApiResponse<Order>>(`/${token}/order`, data),
  getOrders: (token: string, clientSessionId: string) =>
    qrApi.get<ApiResponse<Order[]>>(`/${token}/orders`, {
      params: { sessionId: clientSessionId, _t: Date.now() },
    }),
  requestInvoice: (token: string, data: QrInvoiceRequest) =>
    qrApi.post<ApiResponse<QrInvoiceResponse>>(`/${token}/invoice`, data),
  callStaff: (token: string, data?: QrStaffCallForm) =>
    qrApi.post<ApiResponse<StaffCall>>(`/${token}/call`, data || {}),
  submitFeedback: (token: string, data: QrFeedbackForm) => {
    const form = new FormData();
    form.append('customerName', data.customerName);
    form.append('customerPhone', data.customerPhone);
    form.append('customerEmail', data.customerEmail);
    form.append('rating', String(data.rating));
    form.append('content', data.content);
    (data.images || []).forEach((file) => form.append('images', file));
    return qrApi.post<ApiResponse<CustomerFeedback>>(`/${token}/feedback`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
