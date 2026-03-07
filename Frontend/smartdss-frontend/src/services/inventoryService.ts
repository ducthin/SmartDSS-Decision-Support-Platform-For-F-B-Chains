import api from './api';
import type { ApiResponse, Inventory, InventoryTransactionForm, PageResponse } from '@/types';

export const inventoryService = {
  getAll: (page = 0, size = 10, keyword?: string, lowStock?: boolean) =>
    api.get<ApiResponse<PageResponse<Inventory>>>('/inventory', { params: { page, size, keyword: keyword || undefined, lowStock: lowStock ?? undefined } }),
  addStock: (data: InventoryTransactionForm) => api.post<ApiResponse<void>>('/inventory/add', data),
  deductStock: (data: InventoryTransactionForm) => api.post<ApiResponse<void>>('/inventory/deduct', data),
};
