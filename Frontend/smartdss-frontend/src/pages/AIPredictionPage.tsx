import { useState } from 'react';
import {
  Brain, TrendingUp, ShoppingBag, Package, RefreshCw,
  AlertTriangle, Calendar, Info, Sparkles, Clock, MessageSquare,
} from 'lucide-react';
import type { AIPrediction } from '@/types';
import { predictionService } from '@/services/predictionService';
import { reportService } from '@/services/reportService';
import { formatCurrency } from '@/utils/helpers';

const CONFIDENCE_STYLES = {
  high:   'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low:    'bg-red-100 text-red-800 border-red-200',
};

function confidenceLabel(score: number) {
  if (score >= 0.75) return { label: 'Cao',        pct: Math.round(score * 100), style: CONFIDENCE_STYLES.high };
  if (score >= 0.45) return { label: 'Trung bình', pct: Math.round(score * 100), style: CONFIDENCE_STYLES.medium };
  return                    { label: 'Thấp',        pct: Math.round(score * 100), style: CONFIDENCE_STYLES.low };
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function dayOfWeekVN(dateStr: string) {
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[new Date(dateStr + 'T00:00:00').getDay()];
}

export default function AIPredictionPage() {
  const [prediction,   setPrediction]   = useState<AIPrediction | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [analysedDate, setAnalysedDate] = useState<string | null>(null);
  const [compareLlm, setCompareLlm] = useState(false);
  const [exportFromDate, setExportFromDate] = useState<string>(daysAgoISO(365));
  const [exportToDate, setExportToDate] = useState<string>(todayISO());
  const [exportingDataset, setExportingDataset] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const isFuture = selectedDate > todayISO();

  const handleAnalyse = () => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    predictionService.getTodayPrediction(selectedDate, { compareLlm })
      .then((res) => {
        setPrediction(res.data);
        setAnalysedDate(selectedDate);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ||
          'Không thể kết nối tới AI Service. Kiểm tra Python ML Server đang chạy!'
        );
      })
      .finally(() => setLoading(false));
  };

  const handleExportTrainingData = async () => {
    setExportingDataset(true);
    setExportError(null);
    try {
      const res = await reportService.downloadMlTrainingCsv(exportFromDate, exportToDate);
      const contentDisposition = (res.headers?.['content-disposition'] ?? '') as string;
      const filenameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
      const fileName = filenameMatch?.[1] || `training_data_real_${exportFromDate}_${exportToDate}.csv`;

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const maybeAxiosErr = err as {
        response?: { data?: { message?: string } };
      };
      setExportError(
        maybeAxiosErr?.response?.data?.message ||
        'Không tải được dữ liệu thật từ backend. Kiểm tra đăng nhập Manager/Admin và server backend.'
      );
    } finally {
      setExportingDataset(false);
    }
  };

  const conf = prediction ? confidenceLabel(prediction.confidence_score) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Brain size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            AI Phân tích & Dự báo
            <span className="text-sm font-normal bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
              Powered by ML
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Dự báo doanh thu • Số đơn hàng • Gợi ý nhập kho — cho bất kỳ ngày nào
          </p>
        </div>
      </div>

      {/* ── Control Panel ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Sparkles size={15} className="text-indigo-400" />
          Thiết lập Phân tích
        </h2>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end">
          {/* Date picker */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              📅 Ngày cần dự báo
            </label>
            <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <input
                id="ai-prediction-date"
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setPrediction(null); }}
                className="flex-1 bg-transparent text-sm text-gray-800 outline-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 flex-shrink-0">
                {dayOfWeekVN(selectedDate)}
              </span>
            </div>
          </div>

          {/* Shortcut buttons */}
          <div className="flex gap-2">
            {[
              { label: 'Hôm nay',     delta: 0 },
              { label: 'Ngày mai',    delta: 1 },
              { label: 'Tuần tới',    delta: 7 },
            ].map(({ label, delta }) => {
              const d = new Date();
              d.setDate(d.getDate() + delta);
              const iso = d.toISOString().split('T')[0];
              return (
                <button
                  key={label}
                  onClick={() => { setSelectedDate(iso); setPrediction(null); }}
                  className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                    selectedDate === iso
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={compareLlm}
              onChange={(e) => { setCompareLlm(e.target.checked); setPrediction(null); }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            So sánh LLM (Groq)
          </label>

          {/* Analyse button */}
          <button
            id="btn-ai-analyse"
            onClick={handleAnalyse}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all ${
              loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
            }`}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang phân tích...' : 'Phân tích ngay'}
          </button>
        </div>

        {/* Info banner for future dates */}
        {isFuture && (
          <div className="mt-4 flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            <Info size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Chế độ dự báo tương lai</span> —
              AI sẽ sử dụng: <strong>sự kiện / ngày lễ bạn đã đăng ký</strong> trong hệ thống
              + <strong>thời tiết ước tính theo mùa</strong> tháng {new Date(selectedDate + 'T00:00:00').getMonth() + 1}
              + ngày trong tuần (<strong>{dayOfWeekVN(selectedDate)}</strong>).
              <br />
              <span className="text-blue-500 text-xs mt-0.5 block">
                💡 Tạo Event trước cho {selectedDate} để AI phản ánh chính xác hơn.
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-emerald-800">Xuất dữ liệu thật để train AI</h3>
            <span className="text-xs text-emerald-700">CSV chuẩn theo schema training_data.csv</span>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-emerald-900 mb-1">Từ ngày</label>
              <input
                type="date"
                value={exportFromDate}
                onChange={(e) => setExportFromDate(e.target.value)}
                className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-900 mb-1">Đến ngày</label>
              <input
                type="date"
                value={exportToDate}
                onChange={(e) => setExportToDate(e.target.value)}
                className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
            <button
              onClick={handleExportTrainingData}
              disabled={exportingDataset}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                exportingDataset
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {exportingDataset ? 'Đang xuất CSV...' : 'Tải dữ liệu thật'}
            </button>
          </div>

          {exportError && (
            <p className="mt-3 text-xs text-red-600">{exportError}</p>
          )}

          <p className="mt-2 text-xs text-emerald-700">
            Gồm các cột: weather, holiday, event impact, lag sales, revenue, orders để huấn luyện mô hình tại ml-service.
          </p>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Không thể phân tích</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!prediction && !loading && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain size={32} className="text-indigo-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-500 mb-1">Chọn ngày và bấm "Phân tích ngay"</h3>
          <p className="text-sm text-gray-400">
            AI sẽ phân tích từ thời tiết, sự kiện, mật độ khu vực và thứ ngày trong tuần
          </p>
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────── */}
      {prediction && analysedDate && (
        <div className="space-y-4 animate-in fade-in duration-300">

          {/* Result header */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={14} />
              Kết quả dự báo cho <strong className="text-gray-800">{dayOfWeekVN(analysedDate)}, {analysedDate}</strong>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${conf?.style}`}>
              Độ tự tin: {conf?.label} ({conf?.pct}%)
            </span>
            {analysedDate > todayISO() && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                📅 Dự báo tương lai
              </span>
            )}
          </div>

          {/* Message */}
          {prediction.message && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">{prediction.message}</p>
          )}

          {/* Hôm nay: đã thu + baseline ML + hậu chỉnh EOD */}
          {prediction.prediction_kind === 'eod_adjusted' &&
            prediction.ml_baseline_revenue != null && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 text-sm text-teal-900 space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <Clock size={16} />
                  Dự báo theo giờ & số liệu thực (cuối ngày)
                </p>
                {prediction.analysis_at_local && (
                  <p className="text-xs text-teal-700">
                    Phân tích lúc <strong>{prediction.analysis_at_local}</strong>
                    {prediction.day_progress_fraction != null && (
                      <> — ước ~<strong>{Math.round(prediction.day_progress_fraction * 100)}%</strong> &quot;nhịp ngày&quot; điển hình đã qua</>
                    )}
                  </p>
                )}
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/70 rounded-lg px-3 py-2 border border-teal-100">
                    <span className="text-teal-600">Đã ghi nhận hôm nay</span>
                    <p className="font-bold text-teal-900">
                      {formatCurrency(prediction.actual_revenue_so_far ?? 0)}
                      <span className="font-normal text-teal-700">
                        {' '}
                        · {prediction.actual_orders_so_far ?? 0} đơn
                      </span>
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-lg px-3 py-2 border border-teal-100">
                    <span className="text-teal-600">ML cả ngày (trước chỉnh)</span>
                    <p className="font-bold text-teal-900">
                      {formatCurrency(prediction.ml_baseline_revenue)}
                      <span className="font-normal text-teal-700">
                        {' '}
                        · {prediction.ml_baseline_orders ?? '—'} đơn
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-teal-800">
                  Số <strong>doanh thu / đơn lớn</strong> phía trên là <strong>ước cuối ngày</strong> sau khi trộn ML với thực tế đã thu (phù hợp khi đang trong ngày).
                </p>
              </div>
            )}

          {prediction.prediction_kind === 'full_day_ml' &&
            analysedDate === todayISO() &&
            (prediction.actual_revenue_so_far ?? 0) > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Đã thu {formatCurrency(prediction.actual_revenue_so_far!)} — hệ thống vẫn hiển thị{' '}
                <strong>dự báo ML cả ngày</strong> (chưa đủ điều kiện hậu chỉnh hoặc còn sớm).
              </p>
            )}

          {/* Core KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-200 p-5">
              <div className="flex items-center gap-2 text-indigo-500 mb-2">
                <TrendingUp size={18} />
                <span className="text-xs font-semibold uppercase tracking-wider">Doanh thu dự kiến</span>
              </div>
              <p className="text-3xl font-bold text-indigo-900">{formatCurrency(prediction.predicted_revenue)}</p>
              <p className="text-xs text-indigo-400 mt-1">
                {prediction.prediction_kind === 'eod_adjusted'
                  ? 'Ước tổng cuối ngày (ML + đã thu thực + giờ hiện tại)'
                  : 'Tổng doanh thu trong ngày (ML cả ngày)'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-5">
              <div className="flex items-center gap-2 text-purple-500 mb-2">
                <ShoppingBag size={18} />
                <span className="text-xs font-semibold uppercase tracking-wider">Số đơn dự kiến</span>
              </div>
              <p className="text-3xl font-bold text-purple-900">{prediction.predicted_orders} <span className="text-lg font-normal">đơn</span></p>
              <p className="text-xs text-purple-400 mt-1">
                ≈ {formatCurrency(prediction.predicted_revenue / Math.max(1, prediction.predicted_orders))} / đơn
              </p>
            </div>
          </div>

          {/* So sánh OpenAI (tùy chọn) */}
          {prediction.llm_comparison && (
            <div
              className={`rounded-2xl border p-5 ${
                prediction.llm_comparison.status === 'ok'
                  ? 'bg-slate-50 border-slate-200'
                  : prediction.llm_comparison.status === 'skipped'
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <MessageSquare size={18} />
                So sánh LLM
                {prediction.llm_comparison.model && (
                  <span className="text-xs font-normal text-slate-500">
                    (model: {prediction.llm_comparison.model})
                  </span>
                )}
                <span className="ml-auto text-xs font-mono uppercase text-slate-400">
                  {prediction.llm_comparison.status}
                </span>
              </div>
              {prediction.llm_comparison.status === 'ok' && (
                <>
                  {prediction.llm_comparison.comment_vi && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{prediction.llm_comparison.comment_vi}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {prediction.llm_comparison.rough_revenue_vnd != null && (
                      <span className="text-slate-600">
                        Ước lượng LLM (tham khảo):{' '}
                        <strong>{formatCurrency(prediction.llm_comparison.rough_revenue_vnd)}</strong>
                      </span>
                    )}
                    {prediction.llm_comparison.rough_orders != null && (
                      <span className="text-slate-600">
                        Đơn (tham khảo): <strong>{prediction.llm_comparison.rough_orders}</strong>
                      </span>
                    )}
                    {prediction.llm_comparison.vs_ml && (
                      <span className="text-slate-500">
                        So với ML: <strong>{prediction.llm_comparison.vs_ml}</strong>
                      </span>
                    )}
                  </div>
                </>
              )}
              {(prediction.llm_comparison.status === 'skipped' || prediction.llm_comparison.status === 'error') &&
                prediction.llm_comparison.detail && (
                  <p className="text-sm text-gray-600">{prediction.llm_comparison.detail}</p>
                )}
            </div>
          )}

          {/* Inventory DSS */}
          {Object.keys(prediction.predicted_inventory_demand).length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Package size={16} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Gợi ý Nhập kho (chỉ khi thiếu)</h3>
                  <p className="text-xs text-gray-400">
                    So sánh nhu cầu ước với <strong>tồn hiện tại</strong> — chỉ hiện mức <strong>cần nhập thêm</strong> (nếu đủ hàng thì không gợi ý).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(prediction.predicted_inventory_demand).map(([name, qty]) => (
                  <div
                    key={name}
                    className="flex flex-col bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100 px-4 py-3"
                  >
                    <span className="text-xs text-gray-500 mb-1">{name}</span>
                    <span className="text-xl font-bold text-amber-800">
                      {typeof qty === 'number' && !Number.isInteger(qty) ? qty.toFixed(2) : qty}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-3 bg-gray-50 rounded-lg px-3 py-2">
                ⚠️ Số liệu là <strong>mức thiếu gợi ý</strong> theo ~{prediction.predicted_orders} đơn dự kiến. Kiểm tra lại tồn và đơn vị trước khi đặt hàng.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
