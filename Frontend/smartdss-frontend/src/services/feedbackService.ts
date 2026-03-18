import api from './api';
import type { ApiResponse, CustomerFeedback, PageResponse } from '@/types';

export const feedbackService = {
  getAll: (page = 0, size = 10) =>
    api.get<ApiResponse<PageResponse<CustomerFeedback>>>('/feedbacks', { params: { page, size } }),
};
