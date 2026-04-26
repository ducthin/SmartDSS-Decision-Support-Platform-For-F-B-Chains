import api from './api';
import type { ApiResponse, NotificationTestRequest, NotificationTestResult } from '@/types';

export const notificationService = {
  sendTest: (data: NotificationTestRequest) =>
    api.post<ApiResponse<NotificationTestResult>>('/notifications/test', data),
};
