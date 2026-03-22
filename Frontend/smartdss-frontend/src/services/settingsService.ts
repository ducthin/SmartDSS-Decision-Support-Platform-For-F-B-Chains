import api from './api';
import type { ApiResponse, StoreLocation, StoreLocationUpdate } from '@/types';

export interface StaffCallSoundSetting {
  soundUrl: string | null;
}

function getBackendOrigin() {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  return apiBase.replace(/\/api\/v1\/?$/, '');
}

export function resolveBackendUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  return `${getBackendOrigin()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export const settingsService = {
  getStaffCallSound: () =>
    api.get<ApiResponse<StaffCallSoundSetting>>('/settings/staff-call-sound'),
  uploadStaffCallSound: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<StaffCallSoundSetting>>('/settings/staff-call-sound', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  clearStaffCallSound: () =>
    api.delete<ApiResponse<StaffCallSoundSetting>>('/settings/staff-call-sound'),
  getStoreLocation: () =>
    api.get<ApiResponse<StoreLocation>>('/settings/store-location'),
  updateStoreLocation: (payload: StoreLocationUpdate) =>
    api.put<ApiResponse<StoreLocation>>('/settings/store-location', payload),
};

