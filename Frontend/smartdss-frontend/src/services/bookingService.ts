import api from './api';
import type { ApiResponse, BookingStatus, PageResponse, TableBooking } from '@/types';

export const bookingService = {
  getAll: (
    page = 0,
    size = 10,
    filters?: {
      status?: BookingStatus;
      keyword?: string;
      fromDate?: string;
      toDate?: string;
    }
  ) =>
    api.get<ApiResponse<PageResponse<TableBooking>>>('/bookings', {
      params: {
        page,
        size,
        status: filters?.status || undefined,
        keyword: filters?.keyword?.trim() || undefined,
        fromDate: filters?.fromDate || undefined,
        toDate: filters?.toDate || undefined,
      },
    }),
  updateStatus: (id: number, status: BookingStatus) =>
    api.put<ApiResponse<TableBooking>>(`/bookings/${id}/status`, { status }),
};
