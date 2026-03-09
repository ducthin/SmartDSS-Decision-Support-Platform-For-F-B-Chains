import axios from 'axios';
import type { ApiResponse, DiningTable, MenuItem, Order, QrOrderForm } from '@/types';

const qrApi = axios.create({
  baseURL: 'http://localhost:8080/api/v1/public/qr',
  headers: { 'Content-Type': 'application/json' },
});

export const qrService = {
  getTableInfo: (token: string) =>
    qrApi.get<ApiResponse<DiningTable>>(`/${token}/info`),
  getMenu: (token: string) =>
    qrApi.get<ApiResponse<MenuItem[]>>(`/${token}/menu`),
  placeOrder: (token: string, data: QrOrderForm) =>
    qrApi.post<ApiResponse<Order>>(`/${token}/order`, data),
  getOrders: (token: string) =>
    qrApi.get<ApiResponse<Order[]>>(`/${token}/orders?_t=${Date.now()}`),
};
