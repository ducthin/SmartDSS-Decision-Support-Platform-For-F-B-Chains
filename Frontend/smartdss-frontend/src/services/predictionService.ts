import api from './api';
import type { AIPrediction } from '@/types';

export type PredictionOptions = {
  /** Gọi LLM (mặc định Groq) để so sánh với ML — cần GROQ_API_KEY hoặc OPENAI_API_KEY */
  compareLlm?: boolean;
};

export const predictionService = {
  /**
   * Lấy dự báo AI cho ngày chỉ định (mặc định = hôm nay).
   * @param date yyyy-MM-dd (tuỳ chọn)
   */
  getTodayPrediction: (date?: string, options?: PredictionOptions) =>
    api.get<AIPrediction>('/predictions', {
      params: {
        ...(date ? { date } : {}),
        ...(options?.compareLlm ? { compareLlm: true } : {}),
      },
      timeout: options?.compareLlm ? 90000 : 30000,
    }),
};
