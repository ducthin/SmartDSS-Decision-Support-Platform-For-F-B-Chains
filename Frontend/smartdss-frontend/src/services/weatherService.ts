import api from './api';
import type { ApiResponse, WeatherData } from '@/types';

export const weatherService = {
  getToday: () => api.get<ApiResponse<WeatherData>>('/weather/today'),
  getByDate: (date: string) => api.get<ApiResponse<WeatherData>>('/weather/date', { params: { date } }),
  getRange: (from: string, to: string) => api.get<ApiResponse<WeatherData[]>>('/weather/range', { params: { from, to } }),
  fetchNow: () => api.post<ApiResponse<WeatherData>>('/weather/fetch'),
};
