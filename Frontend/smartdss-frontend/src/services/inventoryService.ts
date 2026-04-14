import api from './api';
import type {
  ApiResponse,
  Inventory,
  InventoryItemForm,
  InventoryTransactionForm,
  InventoryTransactionHistory,
  PageResponse
} from '@/types';

export const inventoryService = {
  getAll: (page = 0, size = 10, keyword?: string, lowStock?: boolean) =>
    api.get<ApiResponse<PageResponse<Inventory>>>('/inventory', { params: { page, size, keyword: keyword || undefined, lowStock: lowStock ?? undefined } }),
  addStock: (data: InventoryTransactionForm) => api.post<ApiResponse<void>>('/inventory/add', data),
  deductStock: (data: InventoryTransactionForm) => api.post<ApiResponse<void>>('/inventory/deduct', data),
  createItem: (data: InventoryItemForm) => api.post<ApiResponse<Inventory>>('/inventory/items', data),
  updateItem: (inventoryId: number, data: InventoryItemForm) => api.put<ApiResponse<Inventory>>(`/inventory/items/${inventoryId}`, data),
  updateMarketPrice: (inventoryId: number, data: { marketUnitPrice: number; source?: string }) =>
    api.put<ApiResponse<Inventory>>(`/inventory/${inventoryId}/market-price`, data),
  updateUnitCost: (inventoryId: number, data: { unitCost: number }) =>
    api.put<ApiResponse<Inventory>>(`/inventory/${inventoryId}/unit-cost`, data),
  getTransactions: (inventoryId: number, page = 0, size = 10) =>
    api.get<ApiResponse<PageResponse<InventoryTransactionHistory>>>(`/inventory/${inventoryId}/transactions`, { params: { page, size } }),
};
