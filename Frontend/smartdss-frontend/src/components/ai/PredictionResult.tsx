import { TrendingUp, ShoppingBag, Package, Clock, MessageSquare } from 'lucide-react';
import type { AIPrediction } from '@/types';
import { formatCurrency } from '@/utils/helpers';

function todayISO() { return new Date().toISOString().split('T')[0]; }

const CONF_STYLE = {
  high:   'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low:    'bg-red-100 text-red-800 border-red-200',
};

function confLabel(score: number) {
  if (score >= 0.75) return { label: 'Cao', pct: Math.round(score * 100), style: CONF_STYLE.high };
  if (score >= 0.45) return { label: 'TB',  pct: Math.round(score * 100), style: CONF_STYLE.medium };
  return { label: 'Thấp', pct: Math.round(score * 100), style: CONF_STYLE.low };
}

function dayVN(d: string) {
  return ['CN','T2','T3','T4','T5','T6','T7'][new Date(d+'T00:00:00').getDay()];
}

interface Props { prediction: AIPrediction; date: string; }

export default function PredictionResult({ prediction, date }: Props) {
  const conf = confLabel(prediction.confidence_score);
  const isFuture = date > todayISO();

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Header strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm text-[rgba(26,14,7,0.5)]">
          <Clock size={13} />
          <strong className="text-[#1a0e07]">{dayVN(date)}, {date}</strong>
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.style}`}>
          Tin cậy: {conf.label} {conf.pct}%
        </span>
        {isFuture && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">📅 Tương lai</span>}
        {prediction.prediction_kind === 'eod_adjusted' && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">🔄 Hậu chỉnh EOD</span>
        )}
      </div>

      {prediction.message && (
        <p className="text-xs text-[rgba(26,14,7,0.4)] bg-[rgba(253,247,240,0.6)] border border-[rgba(107,80,64,0.08)] rounded-lg px-3 py-2 line-clamp-2">{prediction.message}</p>
      )}

      {/* EOD intraday info */}
      {prediction.prediction_kind === 'eod_adjusted' && prediction.ml_baseline_revenue != null && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
            <p className="text-teal-600 mb-0.5">Đã thu hôm nay</p>
            <p className="font-bold text-teal-900">{formatCurrency(prediction.actual_revenue_so_far ?? 0)}
              <span className="font-normal text-teal-700"> · {prediction.actual_orders_so_far ?? 0} đơn</span>
            </p>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
            <p className="text-teal-600 mb-0.5">ML baseline</p>
            <p className="font-bold text-teal-900">{formatCurrency(prediction.ml_baseline_revenue)}
              <span className="font-normal text-teal-700"> · {prediction.ml_baseline_orders ?? '—'} đơn</span>
            </p>
          </div>
        </div>
      )}

      {/* Core KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-200 p-4">
          <div className="flex items-center gap-1.5 text-indigo-500 mb-1.5">
            <TrendingUp size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">Doanh thu</span>
          </div>
          <p className="text-2xl font-bold text-indigo-900">{formatCurrency(prediction.predicted_revenue)}</p>
          <p className="text-xs text-indigo-400 mt-0.5">
            {prediction.prediction_kind === 'eod_adjusted' ? 'Ước cuối ngày' : 'Dự báo cả ngày'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-4">
          <div className="flex items-center gap-1.5 text-purple-500 mb-1.5">
            <ShoppingBag size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">Số đơn</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{prediction.predicted_orders} <span className="text-base font-normal">đơn</span></p>
          <p className="text-xs text-purple-400 mt-0.5">
            ≈ {formatCurrency(prediction.predicted_revenue / Math.max(1, prediction.predicted_orders))} / đơn
          </p>
        </div>
      </div>

      {/* LLM comparison */}
      {prediction.llm_comparison && prediction.llm_comparison.status === 'ok' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
            <MessageSquare size={15} /> So sánh LLM
            {prediction.llm_comparison.model && <span className="text-xs font-normal text-slate-400">({prediction.llm_comparison.model})</span>}
          </div>
          {prediction.llm_comparison.comment_vi && (
            <p className="text-sm text-slate-600 mb-2">{prediction.llm_comparison.comment_vi}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {prediction.llm_comparison.rough_revenue_vnd != null && (
              <span>LLM ước: <strong className="text-slate-700">{formatCurrency(prediction.llm_comparison.rough_revenue_vnd)}</strong></span>
            )}
            {prediction.llm_comparison.rough_orders != null && (
              <span>Đơn: <strong className="text-slate-700">{prediction.llm_comparison.rough_orders}</strong></span>
            )}
            {prediction.llm_comparison.vs_ml && <span>vs ML: <strong>{prediction.llm_comparison.vs_ml}</strong></span>}
          </div>
        </div>
      )}

      {/* Inventory */}
      {Object.keys(prediction.predicted_inventory_demand).length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package size={14} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a0e07]">Gợi ý nhập kho</p>
              <p className="text-xs text-[rgba(26,14,7,0.4)]">Chỉ hiển thị nguyên liệu cần nhập thêm</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(prediction.predicted_inventory_demand).map(([name, qty]) => (
              <div key={name} className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-100 px-3 py-2">
                <p className="text-xs text-[rgba(26,14,7,0.45)] mb-0.5 truncate">{name}</p>
                <p className="text-lg font-bold text-amber-800">
                  {typeof qty === 'number' && !Number.isInteger(qty) ? qty.toFixed(2) : qty}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[rgba(26,14,7,0.35)] mt-2">⚠️ Mức thiếu ước tính theo {prediction.predicted_orders} đơn dự báo</p>
        </div>
      )}
    </div>
  );
}
