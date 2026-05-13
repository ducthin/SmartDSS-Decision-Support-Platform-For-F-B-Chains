import '@/styles/coffee-theme.css';
import { useState, useEffect, useCallback } from 'react';
import { Brain, RefreshCw, Calendar, Sparkles, Info, AlertTriangle, Download } from 'lucide-react';
import type { AIPrediction } from '@/types';
import { predictionService } from '@/services/predictionService';
import { reportService } from '@/services/reportService';
import { mlAdminService, type RetrainStatus } from '@/services/mlAdminService';
import RetrainPanel from '@/components/ai/RetrainPanel';
import PredictionResult from '@/components/ai/PredictionResult';

function todayISO() { return new Date().toISOString().split('T')[0]; }
function daysAgoISO(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }
function dayVN(d: string) { return ['Chủ nhật', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(d + 'T00:00:00').getDay()]; }

type ActiveTab = 'predict' | 'retrain' | 'export';

export default function AIPredictionPage() {
  const [tab, setTab] = useState<ActiveTab>('predict');
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [analysedDate, setAnalysedDate] = useState<string | null>(null);
  const [compareLlm, setCompareLlm] = useState(false);
  const [exportFrom, setExportFrom] = useState(daysAgoISO(365));
  const [exportTo, setExportTo] = useState(todayISO());
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [retrainStatus, setRetrainStatus] = useState<RetrainStatus | null>(null);
  const [retrainLoading, setRetrainLoading] = useState(false);
  const [retrainError, setRetrainError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const isFuture = selectedDate > todayISO();

  const fetchRetrain = useCallback(() => {
    setRetrainLoading(true);
    mlAdminService.getRetrainStatus()
      .then(r => setRetrainStatus(r.data))
      .catch(() => setRetrainError('Không kết nối được ML Service (port 8000).'))
      .finally(() => setRetrainLoading(false));
  }, []);

  useEffect(() => {
    fetchRetrain();
    const id = setInterval(fetchRetrain, 30_000);
    return () => clearInterval(id);
  }, [fetchRetrain]);

  const handleAnalyse = () => {
    setLoading(true); setError(null); setPrediction(null);
    predictionService.getTodayPrediction(selectedDate, { compareLlm })
      .then(r => { setPrediction(r.data); setAnalysedDate(selectedDate); })
      .catch(e => setError(e?.response?.data?.message || 'Không kết nối được AI Service. Kiểm tra Python ML Server!'))
      .finally(() => setLoading(false));
  };

  const handleExport = async () => {
    setExporting(true); setExportErr(null);
    try {
      const res = await reportService.downloadMlTrainingCsv(exportFrom, exportTo);
      const cd = (res.headers?.['content-disposition'] ?? '') as string;
      const name = cd.match(/filename="?([^";]+)"?/i)?.[1] || `training_data_${exportFrom}_${exportTo}.csv`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setExportErr(ax?.response?.data?.message || 'Không tải được. Kiểm tra đăng nhập Manager/Admin.');
    } finally { setExporting(false); }
  };

  const handleTrigger = () => {
    setTriggering(true); setTriggerMsg(null);
    mlAdminService.triggerRetrain()
      .then(r => { setTriggerMsg(r.data.message); setTimeout(fetchRetrain, 2000); })
      .catch(() => setTriggerMsg('Không thể kích hoạt. Kiểm tra ML Service.'))
      .finally(() => setTriggering(false));
  };

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'predict', label: 'Dự báo' },
    { id: 'retrain', label: 'Auto-Retrain' },
    { id: 'export', label: 'Xuất CSV' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-[#c9a27a] to-[#6b5040] rounded-xl flex items-center justify-center text-white shadow-md">
          <Brain size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1a0e07] flex items-center gap-2">
            AI Phân tích & Dự báo
            <span className="text-xs font-normal bg-[rgba(201,162,122,0.15)] text-[#7a5c3e] px-2 py-0.5 rounded-full">ML</span>
            {retrainStatus?.current_model_mape_pct != null && (
              <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${retrainStatus.current_model_mape_pct < 15 ? 'bg-green-100 text-green-700'
                : retrainStatus.current_model_mape_pct < 25 ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'}`}>
                MAPE {retrainStatus.current_model_mape_pct.toFixed(1)}%
              </span>
            )}
          </h1>
          <p className="text-xs text-[rgba(26,14,7,0.45)]">Dự báo doanh thu · số đơn · gợi ý kho</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[rgba(253,247,240,0.8)] p-1 rounded-xl border border-[rgba(107,80,64,0.08)]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${tab === t.id
              ? 'bg-white text-[#6b5040] shadow-sm border border-[rgba(107,80,64,0.1)]'
              : 'text-[rgba(26,14,7,0.45)] hover:text-[#6b5040]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Dự báo ─────────────────────────────────────────── */}
      {tab === 'predict' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[rgba(107,80,64,0.1)] shadow-sm p-4 space-y-4">
            <h2 className="text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#c9a27a]" /> Thiết lập
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              {/* Date */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-[rgba(26,14,7,0.55)] mb-1">Ngày dự báo</label>
                <div className="flex items-center gap-2 border border-[rgba(107,80,64,0.15)] rounded-xl px-3 py-2 bg-[rgba(253,247,240,0.5)] focus-within:border-[#c9a27a] transition-colors">
                  <Calendar size={14} className="text-[rgba(107,80,64,0.4)] shrink-0" />
                  <input id="ai-date" type="date" value={selectedDate}
                    onChange={e => { setSelectedDate(e.target.value); setPrediction(null); }}
                    className="flex-1 bg-transparent text-sm text-[#1a0e07] outline-none" />
                  <span className="text-xs text-[rgba(26,14,7,0.35)] shrink-0">{dayVN(selectedDate)}</span>
                </div>
              </div>

              {/* Shortcuts */}
              <div className="flex gap-1.5">
                {[{ l: 'Hôm nay', d: 0 }, { l: 'Ngày mai', d: 1 }, { l: '+7', d: 7 }].map(({ l, d }) => {
                  const dt = new Date(); dt.setDate(dt.getDate() + d);
                  const iso = dt.toISOString().split('T')[0];
                  return (
                    <button key={l} onClick={() => { setSelectedDate(iso); setPrediction(null); }}
                      className={`text-xs px-2.5 py-2 rounded-lg border transition-colors ${selectedDate === iso
                        ? 'bg-[#6b5040] text-white border-[#6b5040]'
                        : 'bg-white text-[rgba(26,14,7,0.55)] border-[rgba(107,80,64,0.15)] hover:border-[#c9a27a]'}`}>
                      {l}
                    </button>
                  );
                })}
              </div>

              {/* LLM toggle + Analyse */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-[rgba(26,14,7,0.55)] cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={compareLlm}
                    onChange={e => { setCompareLlm(e.target.checked); setPrediction(null); }}
                    className="rounded accent-[#6b5040]" />
                  So sánh LLM
                </label>
                <button id="btn-ai-analyse" onClick={handleAnalyse} disabled={loading}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all whitespace-nowrap ${loading ? 'bg-[rgba(107,80,64,0.08)] text-[rgba(26,14,7,0.3)] cursor-not-allowed'
                    : 'bg-[#6b5040] text-white hover:brightness-110 active:scale-95'}`}>
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Đang phân tích...' : 'Phân tích'}
                </button>
              </div>
            </div>

            {isFuture && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span><strong>Dự báo tương lai</strong> — AI dùng thời tiết ước tính tháng {new Date(selectedDate + 'T00:00:00').getMonth() + 1} + ngày lễ đã đăng ký + thứ {dayVN(selectedDate)}.</span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div><p className="font-medium text-sm">Không thể phân tích</p><p className="text-xs mt-0.5">{error}</p></div>
            </div>
          )}

          {/* Empty */}
          {!prediction && !loading && !error && (
            <div className="bg-white rounded-2xl border border-dashed border-[rgba(107,80,64,0.18)] p-12 text-center">
              <div className="w-14 h-14 bg-[rgba(201,162,122,0.08)] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Brain size={28} className="text-[rgba(107,80,64,0.25)]" />
              </div>
              <p className="text-sm font-medium text-[rgba(26,14,7,0.35)]">Chọn ngày và bấm "Phân tích"</p>
              <p className="text-xs text-[rgba(26,14,7,0.25)] mt-1">AI sẽ phân tích thời tiết · sự kiện · mật độ khu vực · chu kỳ tuần</p>
            </div>
          )}

          {/* Result */}
          {prediction && analysedDate && <PredictionResult prediction={prediction} date={analysedDate} />}
        </div>
      )}

      {/* ── Tab: Auto-Retrain ────────────────────────────────────── */}
      {tab === 'retrain' && (
        <RetrainPanel
          status={retrainStatus}
          loading={retrainLoading}
          error={retrainError}
          triggerMsg={triggerMsg}
          triggering={triggering}
          onRefresh={fetchRetrain}
          onTrigger={handleTrigger}
        />
      )}

      {/* ── Tab: Xuất CSV ────────────────────────────────────────── */}
      {tab === 'export' && (
        <div className="bg-white rounded-2xl border border-[rgba(107,80,64,0.1)] shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[rgba(26,14,7,0.45)] uppercase tracking-wide flex items-center gap-1.5">
            <Download size={13} className="text-[#c9a27a]" /> Xuất dữ liệu thật để train AI
          </h2>
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[rgba(26,14,7,0.55)] mb-1">Từ ngày</label>
              <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                className="w-full border border-[rgba(107,80,64,0.15)] rounded-xl px-3 py-2 text-sm bg-[rgba(253,247,240,0.5)] outline-none focus:border-[#c9a27a]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgba(26,14,7,0.55)] mb-1">Đến ngày</label>
              <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                className="w-full border border-[rgba(107,80,64,0.15)] rounded-xl px-3 py-2 text-sm bg-[rgba(253,247,240,0.5)] outline-none focus:border-[#c9a27a]" />
            </div>
            <button onClick={handleExport} disabled={exporting}
              className={`h-10 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${exporting ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              <Download size={14} />
              {exporting ? 'Đang xuất...' : 'Tải CSV'}
            </button>
          </div>
          {exportErr && <p className="text-xs text-red-600">{exportErr}</p>}
          <p className="text-xs text-[rgba(26,14,7,0.4)] bg-[rgba(253,247,240,0.6)] rounded-lg px-3 py-2">
            CSV chuẩn schema: date · weather · holiday · event · lag sales · revenue · orders — dùng để huấn luyện mô hình AI.
          </p>
        </div>
      )}
    </div>
  );
}
