import { RefreshCw, Cpu, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp, Activity, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { RetrainStatus } from '@/services/mlAdminService';

const S = {
  card: 'bg-[rgba(253,247,240,0.8)] rounded-xl border border-[rgba(107,80,64,0.08)] px-3 py-2.5',
  label: 'text-xs text-[rgba(26,14,7,0.4)] mb-0.5',
  val: 'text-sm font-semibold text-[#1a0e07]',
};

interface Props {
  status: RetrainStatus | null;
  loading: boolean;
  error: string | null;
  triggerMsg: string | null;
  triggering: boolean;
  onRefresh: () => void;
  onTrigger: () => void;
}

export default function RetrainPanel({ status, loading, error, triggerMsg, triggering, onRefresh, onTrigger }: Props) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[rgba(107,80,64,0.1)] shadow-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide flex items-center gap-1.5">
          <Cpu size={13} className="text-[#c9a27a]" /> Auto-Retrain
        </span>
        <div className="flex items-center gap-2">
          {status && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              status.is_retraining ? 'bg-amber-100 text-amber-700'
              : status.retrain_enabled ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'}`}>
              {status.is_retraining ? '⏳ Retraining...' : status.retrain_enabled ? '✅ Active' : '⏸ Off'}
            </span>
          )}
          <button onClick={onRefresh} disabled={loading} className="p-1 rounded-lg text-[rgba(26,14,7,0.35)] hover:bg-[rgba(201,162,122,0.1)] hover:text-[#6b5040] transition-colors">
            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {status && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={S.card}>
              <p className={S.label}>Retrain cuối</p>
              <p className={S.val}>
                {status.last_retrain_at
                  ? new Date(status.last_retrain_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                  : <span className="text-[rgba(26,14,7,0.3)] text-xs">Chưa có</span>}
              </p>
            </div>
            <div className={S.card}>
              <p className={S.label}>Đơn tích lũy</p>
              <p className={S.val}>
                <span className={status.orders_since_last_retrain >= status.config.order_threshold * 0.8 ? 'text-amber-600' : ''}>
                  {status.orders_since_last_retrain.toLocaleString()}
                </span>
                <span className="text-[10px] text-[rgba(26,14,7,0.3)] font-normal">/{status.config.order_threshold}</span>
              </p>
              <div className="mt-1 h-0.5 bg-[rgba(107,80,64,0.08)] rounded-full">
                <div className="h-full bg-[#c9a27a] rounded-full" style={{ width: `${Math.min(100, status.orders_since_last_retrain / status.config.order_threshold * 100)}%` }} />
              </div>
            </div>
            <div className={S.card}>
              <p className={S.label}>MAPE</p>
              <p className={S.val}>
                {status.current_model_mape_pct != null
                  ? <span className={status.current_model_mape_pct < 15 ? 'text-green-600' : status.current_model_mape_pct < 25 ? 'text-amber-600' : 'text-red-500'}>
                      {status.current_model_mape_pct.toFixed(1)}%
                    </span>
                  : <span className="text-[rgba(26,14,7,0.3)] text-xs">—</span>}
              </p>
            </div>
            <div className={S.card}>
              <p className={S.label}>Chu kỳ</p>
              <p className={S.val}>{status.config.interval_days}d / {status.config.order_threshold.toLocaleString()}đ</p>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-[rgba(26,14,7,0.38)] space-y-0.5">
              {status.last_trigger_reason && (
                <span className="flex items-center gap-1"><Activity size={11} className="text-[#c9a27a]" />{status.last_trigger_reason}</span>
              )}
              {status.last_checked_at && (
                <span className="block">Check: {new Date(status.last_checked_at).toLocaleTimeString('vi-VN')} · mỗi {status.config.check_interval_minutes}ph</span>
              )}
            </div>
            <button id="btn-trigger-retrain" onClick={onTrigger} disabled={triggering || status.is_retraining}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                triggering || status.is_retraining
                  ? 'bg-[rgba(107,80,64,0.06)] text-[rgba(26,14,7,0.3)] cursor-not-allowed'
                  : 'bg-[#6b5040] text-white hover:brightness-110 active:scale-95'}`}>
              <RefreshCw size={12} className={triggering || status.is_retraining ? 'animate-spin' : ''} />
              {status.is_retraining ? 'Đang train...' : 'Retrain ngay'}
            </button>
          </div>

          {triggerMsg && (
            <p className="text-xs text-[#6b5040] bg-[rgba(201,162,122,0.08)] rounded-lg px-3 py-1.5 border border-[rgba(107,80,64,0.1)]">{triggerMsg}</p>
          )}

          {/* History */}
          {status.history.length > 0 && (
            <div>
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs text-[rgba(26,14,7,0.4)] hover:text-[#6b5040] transition-colors">
                {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Lịch sử ({status.history.length} lần)
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                  {[...status.history].reverse().map((item, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs ${item.success ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                      {item.success ? <CheckCircle2 size={12} className="mt-0.5 text-green-500 shrink-0" /> : <XCircle size={12} className="mt-0.5 text-red-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-1">
                          <span className={item.success ? 'text-green-800 font-medium' : 'text-red-700 font-medium'}>{item.success ? 'Thành công' : 'Thất bại'}</span>
                          <span className="text-[rgba(26,14,7,0.35)] shrink-0">{new Date(item.started_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[rgba(26,14,7,0.45)] truncate">{item.note}</p>
                        {item.mape_pct != null && <span className="text-[rgba(26,14,7,0.3)]">MAPE: {item.mape_pct}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
