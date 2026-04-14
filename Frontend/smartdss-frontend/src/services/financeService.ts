import api from './api';
import type {
  ApiResponse,
  CashClosing,
  CashClosingForm,
  FinanceCategory,
  FinanceSummary,
  FinanceTransaction,
  FinanceTransactionForm,
  FinanceType,
  GrossProfitPoint,
  PageResponse,
} from '@/types';

export const financeService = {
  getCategories: (activeOnly = true, type?: FinanceType) =>
    api.get<ApiResponse<FinanceCategory[]>>('/finance/categories', { params: { activeOnly, type } }),

  createCategory: (data: { name: string; type: FinanceType; active?: boolean }) =>
    api.post<ApiResponse<FinanceCategory>>('/finance/categories', data),

  getTransactions: (params: {
    page?: number;
    size?: number;
    fromDate?: string;
    toDate?: string;
    type?: FinanceType;
    categoryId?: number;
    keyword?: string;
  }) =>
    api.get<ApiResponse<PageResponse<FinanceTransaction>>>('/finance/transactions', { params }),

  createTransaction: (data: FinanceTransactionForm) =>
    api.post<ApiResponse<FinanceTransaction>>('/finance/transactions', data),

  updateTransaction: (id: number, data: FinanceTransactionForm) =>
    api.put<ApiResponse<FinanceTransaction>>(`/finance/transactions/${id}`, data),

  deleteTransaction: (id: number) =>
    api.delete<ApiResponse<void>>(`/finance/transactions/${id}`),

  getSummary: (fromDate?: string, toDate?: string) =>
    api.get<ApiResponse<FinanceSummary>>('/finance/summary', { params: { fromDate, toDate } }),

  getGrossProfitDaily: (fromDate?: string, toDate?: string) =>
    api.get<ApiResponse<GrossProfitPoint[]>>('/finance/gross-profit/daily', { params: { fromDate, toDate } }),

  getGrossProfitMonthly: (fromDate?: string, toDate?: string) =>
    api.get<ApiResponse<GrossProfitPoint[]>>('/finance/gross-profit/monthly', { params: { fromDate, toDate } }),

  getCashClosings: (params: { page?: number; size?: number; fromDate?: string; toDate?: string }) =>
    api.get<ApiResponse<PageResponse<CashClosing>>>('/finance/cash-closings', { params }),

  previewCashClosing: (businessDate?: string, openingBalance?: number) =>
    api.get<ApiResponse<CashClosing>>('/finance/cash-closings/preview', {
      params: { businessDate, openingBalance },
    }),

  closeCashDay: (data: CashClosingForm) =>
    api.post<ApiResponse<CashClosing>>('/finance/cash-closings', data),
};
