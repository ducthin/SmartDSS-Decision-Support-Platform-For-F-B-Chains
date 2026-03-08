import api from './api';
import type { ApiResponse, HolidayCalendar, HolidayCalendarForm } from '@/types';

export const holidayService = {
  getAll: () => api.get<ApiResponse<HolidayCalendar[]>>('/holidays'),
  getById: (id: number) => api.get<ApiResponse<HolidayCalendar>>(`/holidays/${id}`),
  getRange: (from: string, to: string) =>
    api.get<ApiResponse<HolidayCalendar[]>>('/holidays/range', { params: { from, to } }),
  getByMonth: (month: number, year: number) =>
    api.get<ApiResponse<HolidayCalendar[]>>('/holidays/month', { params: { month, year } }),
  getUpcoming: () => api.get<ApiResponse<HolidayCalendar[]>>('/holidays/upcoming'),
  create: (data: HolidayCalendarForm) => api.post<ApiResponse<HolidayCalendar>>('/holidays', data),
  update: (id: number, data: HolidayCalendarForm) => api.put<ApiResponse<HolidayCalendar>>(`/holidays/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/holidays/${id}`),
  sync: (year?: number) => api.post<ApiResponse<number>>('/holidays/sync-calendarific', null, { params: year ? { year } : {} }),
};
