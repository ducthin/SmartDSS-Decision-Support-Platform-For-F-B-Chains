/**
 * mlAdminService.ts
 * Gọi trực tiếp tới Python ML Service (port 8000) cho các chức năng Admin.
 */
import axios from 'axios';

const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const ML_BASE_URL = import.meta.env.VITE_ML_SERVICE_URL || (isLocalDev ? 'http://localhost:8000' : '/ml-api');

const mlApi = axios.create({
  baseURL: ML_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RetrainHistoryItem {
  started_at: string;
  triggered_by: string;
  success: boolean;
  note: string;
  mape_pct: number | null;
}

export interface RetrainConfig {
  interval_days: number;
  order_threshold: number;
  check_interval_minutes: number;
  mape_improvement_pct: number;
}

export interface RetrainStatus {
  retrain_enabled: boolean;
  is_retraining: boolean;
  last_retrain_at: string | null;
  orders_since_last_retrain: number;
  current_model_mape_pct: number | null;
  last_trigger_reason: string | null;
  last_checked_at: string | null;
  config: RetrainConfig;
  history: RetrainHistoryItem[];
}

// ── Service ────────────────────────────────────────────────────────────────────

export const mlAdminService = {
  /** Lấy trạng thái auto-retrain */
  getRetrainStatus: () =>
    mlApi.get<RetrainStatus>('/api/v1/admin/retrain/status'),

  /** Kích hoạt retrain thủ công ngay lập tức */
  triggerRetrain: () =>
    mlApi.post<{ success: boolean; message: string }>('/api/v1/admin/retrain/trigger'),

  /** Health check tổng quát của ML service */
  getHealth: () =>
    mlApi.get<{ status: string; model_loaded: boolean; auto_retrain: Record<string, unknown> }>('/health'),
};
