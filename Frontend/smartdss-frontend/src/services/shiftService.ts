import api from './api';
import type {
  ApiResponse,
  ShiftAssignment,
  ShiftAssignmentCreatePayload,
  ShiftAssignmentUpdatePayload,
  ShiftAttendance,
  ShiftBulkAssignPayload,
  ShiftCheckPayload,
  ShiftRevenueDetail,
  ShiftTemplate,
  ShiftTemplateForm,
  ShiftType,
  ShiftWorkSummary,
} from '@/types';

export const shiftService = {
  getTemplates: (activeOnly = true, shiftType?: ShiftType) =>
    api.get<ApiResponse<ShiftTemplate[]>>('/shifts/templates', { params: { activeOnly, shiftType } }),

  createTemplate: (data: ShiftTemplateForm) =>
    api.post<ApiResponse<ShiftTemplate>>('/shifts/templates', data),

  updateTemplate: (id: number, data: ShiftTemplateForm) =>
    api.put<ApiResponse<ShiftTemplate>>(`/shifts/templates/${id}`, data),

  deactivateTemplate: (id: number) =>
    api.delete<ApiResponse<void>>(`/shifts/templates/${id}`),

  getAssignments: (params?: { fromDate?: string; toDate?: string; userId?: number; shiftType?: ShiftType }) =>
    api.get<ApiResponse<ShiftAssignment[]>>('/shifts/assignments', { params }),

  getMyAssignments: (params?: { fromDate?: string; toDate?: string }) =>
    api.get<ApiResponse<ShiftAssignment[]>>('/shifts/my-assignments', { params }),

  createAssignment: (data: ShiftAssignmentCreatePayload) =>
    api.post<ApiResponse<ShiftAssignment>>('/shifts/assignments', data),

  createAssignmentsBulk: (data: ShiftBulkAssignPayload) =>
    api.post<ApiResponse<ShiftAssignment[]>>('/shifts/assignments/bulk', data),

  updateAssignment: (id: number, data: ShiftAssignmentUpdatePayload) =>
    api.put<ApiResponse<ShiftAssignment>>(`/shifts/assignments/${id}`, data),

  cancelAssignment: (id: number) =>
    api.delete<ApiResponse<ShiftAssignment>>(`/shifts/assignments/${id}`),

  checkIn: (data: ShiftCheckPayload) =>
    api.post<ApiResponse<ShiftAttendance>>('/shifts/attendance/check-in', data),

  checkOut: (data: ShiftCheckPayload) =>
    api.post<ApiResponse<ShiftAttendance>>('/shifts/attendance/check-out', data),

  getAttendances: (params?: { fromDate?: string; toDate?: string; userId?: number; shiftType?: ShiftType }) =>
    api.get<ApiResponse<ShiftAttendance[]>>('/shifts/attendance', { params }),

  getMyAttendances: (params?: { fromDate?: string; toDate?: string }) =>
    api.get<ApiResponse<ShiftAttendance[]>>('/shifts/my-attendance', { params }),

  getWorkSummary: (params?: { fromDate?: string; toDate?: string; userId?: number; shiftType?: ShiftType }) =>
    api.get<ApiResponse<ShiftWorkSummary[]>>('/shifts/work-summary', { params }),

  getRevenueDetails: (params?: { fromDate?: string; toDate?: string; userId?: number; shiftType?: ShiftType }) =>
    api.get<ApiResponse<ShiftRevenueDetail[]>>('/shifts/revenue-details', { params }),

  exportWorkSummaryCsv: (params?: { fromDate?: string; toDate?: string; userId?: number; shiftType?: ShiftType }) =>
    api.get<Blob>('/shifts/work-summary.csv', {
      params,
      responseType: 'blob',
    }),
};
