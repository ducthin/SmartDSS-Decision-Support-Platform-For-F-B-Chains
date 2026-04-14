import api from './api';
import type { ApiResponse, LoginRequest, LoginResponse, User, PageResponse } from '@/types';

export const authService = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', data),

  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me'),
};

export const userService = {
  getAll: (page = 0, size = 10, keyword?: string) =>
    api.get<ApiResponse<PageResponse<User>>>('/users', { params: { page, size, keyword: keyword || undefined } }),
  create: (data: unknown) => api.post<ApiResponse<User>>('/users', data),
  update: (id: number, data: unknown) => api.put<ApiResponse<User>>(`/users/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/users/${id}`),
};
