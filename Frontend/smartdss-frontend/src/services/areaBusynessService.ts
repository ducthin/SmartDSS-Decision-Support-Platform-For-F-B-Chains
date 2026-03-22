import api from './api';
import type { ApiResponse, AreaBusyness } from '@/types';

export const areaBusynessService = {
  getCurrent: () => api.get<ApiResponse<AreaBusyness>>('/area-busyness/current'),
};
