import axios from 'axios';
import type { ApiResponse, CustomerFeedback, DiningTable, MenuItem, Order, QrDiscountPreview, QrFeedbackForm, QrInvoiceRequest, QrInvoiceResponse, QrOrderForm, QrStaffCallForm, StaffCall, TelegramLinkStatus } from '@/types';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const qrApi = axios.create({
  baseURL: `${apiBaseUrl}/public/qr`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const publicApi = axios.create({
  baseURL: `${apiBaseUrl}/public`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export const qrService = {
  getTableInfo: (token: string) =>
    qrApi.get<ApiResponse<DiningTable>>(`/${token}/info`),
  getMenu: (token: string) =>
    qrApi.get<ApiResponse<MenuItem[]>>(`/${token}/menu`),
  previewDiscount: (token: string, params: { subtotal: number; voucherCode?: string; customerPhone?: string }) =>
    qrApi.get<ApiResponse<QrDiscountPreview>>(`/${token}/discount-preview`, { params }),
  placeOrder: (token: string, data: QrOrderForm) =>
    qrApi.post<ApiResponse<Order>>(`/${token}/order`, data),
  getOrders: (token: string, params: { customerPhone?: string; sessionId?: string }) =>
    qrApi.get<ApiResponse<Order[]>>(`/${token}/orders`, {
      params: { ...params, _t: Date.now() },
    }),
  requestInvoice: (token: string, data: QrInvoiceRequest) =>
    qrApi.post<ApiResponse<QrInvoiceResponse>>(`/${token}/invoice`, data),
  callStaff: (token: string, data?: QrStaffCallForm) =>
    qrApi.post<ApiResponse<StaffCall>>(`/${token}/call`, data || {}),
  getTelegramOptInLink: (phone: string) =>
    publicApi.get<ApiResponse<string>>('/telegram/opt-in-link', { params: { phone } }),
  getTelegramLinkStatus: (phone: string) =>
    publicApi.get<ApiResponse<TelegramLinkStatus>>('/telegram/link-status', { params: { phone } }),
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
