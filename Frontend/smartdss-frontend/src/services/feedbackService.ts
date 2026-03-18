import api from './api';
import type { ApiResponse, CustomerFeedback, FeedbackStats, FeedbackStatus, PageResponse } from '@/types';

export const feedbackService = {
  getStats: () =>
    api.get<ApiResponse<FeedbackStats>>('/feedbacks/stats'),
  getAll: (
    page = 0,
    size = 10,
    filters?: {
      status?: FeedbackStatus;
      rating?: number;
      keyword?: string;
      fromDate?: string;
      toDate?: string;
    }
  ) =>
    api.get<ApiResponse<PageResponse<CustomerFeedback>>>('/feedbacks', {
      params: {
        page,
        size,
        status: filters?.status || undefined,
        rating: filters?.rating || undefined,
        keyword: filters?.keyword?.trim() || undefined,
        fromDate: filters?.fromDate || undefined,
        toDate: filters?.toDate || undefined,
      },
    }),
  updateStatus: (id: number, status: FeedbackStatus, internalNote?: string) =>
    api.put<ApiResponse<CustomerFeedback>>(`/feedbacks/${id}/status`, { status, internalNote }),
};
