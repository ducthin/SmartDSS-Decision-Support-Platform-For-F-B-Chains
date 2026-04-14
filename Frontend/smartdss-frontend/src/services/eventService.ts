import api from './api';
import type { ApiResponse, PageResponse, Event, EventForm } from '@/types';

export const eventService = {
  getAll: (page = 0, size = 10, keyword?: string, eventType?: string) =>
    api.get<ApiResponse<PageResponse<Event>>>('/events', { params: { page, size, keyword, eventType } }),
  getById: (id: number) => api.get<ApiResponse<Event>>(`/events/${id}`),
  getRange: (from: string, to: string) =>
    api.get<ApiResponse<Event[]>>('/events/range', { params: { from, to } }),
  getActive: (date?: string) =>
    api.get<ApiResponse<Event[]>>('/events/active', { params: date ? { date } : {} }),
  getUpcoming: () => api.get<ApiResponse<Event[]>>('/events/upcoming'),
  create: (data: EventForm) => api.post<ApiResponse<Event>>('/events', data),
  update: (id: number, data: EventForm) => api.put<ApiResponse<Event>>(`/events/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/events/${id}`),
};
