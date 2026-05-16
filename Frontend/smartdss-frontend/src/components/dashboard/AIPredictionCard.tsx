import { useState } from 'react';
import { Brain, TrendingUp, ShoppingBag, Package, RefreshCw, AlertTriangle, Calendar, MessageSquare } from 'lucide-react';
import type { AIPrediction } from '@/types';
import { predictionService } from '@/services/predictionService';
import { formatCurrency } from '@/utils/helpers';

interface Props {
  visible: boolean;
}

const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-red-100 text-red-700',
};

function confidenceLabel(score: number) {
  if (score >= 0.75) return { label: 'Cao', style: CONFIDENCE_STYLES.high };
  if (score >= 0.45) return { label: 'Trung bình', style: CONFIDENCE_STYLES.medium };
  return { label: 'Thấp', style: CONFIDENCE_STYLES.low };
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`; // yyyy-MM-dd (local timezone)
}

export default function AIPredictionCard({ visible }: Props) {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [compareLlm, setCompareLlm] = useState(false);

  const fetchPrediction = () => {
    setLoading(true);
    setError(null);
    predictionService.getTodayPrediction(selectedDate, { compareLlm })
      .then((res) => {
        setPrediction(res.data);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message
          || 'Không thể kết nối tới AI Service. Kiểm tra Python ML Server đã chạy chưa!';
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  if (!visible) return null;

  const conf = prediction ? confidenceLabel(prediction.confidence_score) : null;
  const isFuture = selectedDate > todayISO();
  const isToday = selectedDate === todayISO();
  const dateLabel = isToday ? 'Hôm nay' : isFuture ? `Ngày ${selectedDate} (tương lai)` : `Ngày ${selectedDate}`;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">AI Dự báo — {dateLabel}</h2>
            <p className="text-xs text-indigo-500">
              Phân tích từ: Thời tiết + Sự kiện/Lễ + Mật độ khu vực + Ngày trong tuần
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Date picker */}
          <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5">
            <Calendar size={14} className="text-indigo-400" />
            <input
              id="prediction-date"
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setPrediction(null); }}
              className="text-sm text-indigo-700 border-none outline-none bg-transparent cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-indigo-700 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={compareLlm}
              onChange={(e) => { setCompareLlm(e.target.checked); setPrediction(null); }}
              className="rounded border-indigo-200 text-indigo-600"
            />
            + LLM
          </label>

          {/* Analyse button */}
          <button
            onClick={fetchPrediction}
            disabled={loading}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${loading
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
              }`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang phân tích...' : 'Phân tích'}
          </button>
        </div>
      </div>

      {/* Future date notice */}
      {isFuture && !prediction && !loading && !error && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4">
          <Calendar size={16} className="mt-0.5 flex-shrink-0" />
          <span>
            Đang chọn ngày <strong>tương lai ({selectedDate})</strong>. AI sẽ dùng:
            <br />• Sự kiện / Ngày lễ bạn đã <strong>đăng ký trong hệ thống</strong>
            <br />• Thời tiết <strong>ước tính theo mùa</strong> tháng {new Date(selectedDate).getMonth() + 1}
            <br />• Thứ trong tuần được tính tự động
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!prediction && !loading && !error && !isFuture && (
        <div className="text-center py-8 text-indigo-400">
          <Brain size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Bấm <strong>"Phân tích"</strong> để AI dự báo tình hình kinh doanh</p>
          <p className="text-xs mt-1 text-indigo-300">Bao gồm Gợi ý Nhập kho thông minh</p>
        </div>
      )}

      {/* Result */}
      {prediction && (
        <div className="space-y-4">
          {/* Confidence badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${conf?.style}`}>
              Độ tự tin: {conf?.label} ({Math.round(prediction.confidence_score * 100)}%)
            </span>
            {isFuture && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                📅 Dự báo tương lai
              </span>
            )}
            <span className="text-xs text-gray-500 ml-auto">{prediction.message}</span>
          </div>

          {/* Core metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-indigo-100 p-4">
              <div className="flex items-center gap-2 mb-1 text-indigo-500">
                <TrendingUp size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Doanh thu dự kiến</span>
              </div>
              <p className="text-2xl font-bold text-indigo-900">
                {formatCurrency(prediction.predicted_revenue)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-indigo-100 p-4">
              <div className="flex items-center gap-2 mb-1 text-purple-500">
                <ShoppingBag size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Số đơn dự kiến</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {prediction.predicted_orders} đơn
              </p>
            </div>
          </div>

          {prediction.llm_comparison && prediction.llm_comparison.status === 'ok' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700 font-medium mb-1">
                <MessageSquare size={16} />
                LLM ({prediction.llm_comparison.model})
              </div>
              {prediction.llm_comparison.comment_vi && (
                <p className="text-slate-600 text-xs leading-relaxed">{prediction.llm_comparison.comment_vi}</p>
              )}
            </div>
          )}
          {/* DSS Inventory */}
          <div className={`bg-white rounded-lg border p-4 ${Object.keys(prediction.predicted_inventory_demand || {}).length > 0 ? 'border-amber-200' : 'border-emerald-200'}`}>
            {Object.keys(prediction.predicted_inventory_demand || {}).length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-3 text-amber-600">
                  <Package size={16} />
                  <span className="text-sm font-semibold">Nhập kho (thiếu so tồn)</span>
                  <span className="ml-auto text-xs text-amber-400">Chỉ mức cần nhập thêm</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(prediction.predicted_inventory_demand).map(([name, qty]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-gray-700">{name}</span>
                      <span className="text-sm font-bold text-amber-700 ml-2">
                        {typeof qty === 'number' && !Number.isInteger(qty) ? qty.toFixed(2) : qty}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  * Ước tính tối thiểu dựa trên tỷ lệ bán hàng trung bình. Đối chiếu tồn kho thực tế trước khi đặt hàng.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Package size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Tồn kho an toàn</p>
                  <p className="text-xs text-emerald-500">Đủ nguyên liệu cho {prediction.predicted_orders} đơn dự báo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
