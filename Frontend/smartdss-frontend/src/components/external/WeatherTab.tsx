import { Cloud, Droplets, Wind, Thermometer, RefreshCw, MapPin, Activity } from 'lucide-react';
import type { AreaBusyness, WeatherData } from '@/types';

interface Props {
  weather: WeatherData | null;
  weatherRange: WeatherData[];
  areaBusyness: AreaBusyness | null;
  loadingAreaBusyness: boolean;
  canEdit: boolean;
  onFetchNow: () => void;
  onRefreshAreaBusyness: () => void;
}

const BUSYNESS_LABELS: Record<AreaBusyness['level'], string> = {
  IT_DONG: 'Ít đông',
  TRUNG_BINH: 'Trung bình',
  DONG_DUC: 'Đông đúc',
};

const BUSYNESS_STYLES: Record<AreaBusyness['level'], string> = {
  IT_DONG: 'bg-green-100 text-green-700',
  TRUNG_BINH: 'bg-amber-100 text-amber-700',
  DONG_DUC: 'bg-red-100 text-red-700',
};

const SOURCE_TYPE_LABELS = {
  REALTIME: 'Realtime',
  CACHE: 'Cache',
  FALLBACK: 'Fallback',
} as const;

const SOURCE_TYPE_STYLES = {
  REALTIME: 'bg-[rgba(201,162,122,0.18)] text-[#6b5040]',
  CACHE: 'bg-[rgba(107,80,64,0.08)] text-[rgba(26,14,7,0.55)]',
  FALLBACK: 'bg-orange-100 text-orange-700',
} as const;

export default function WeatherTab({
  weather,
  weatherRange,
  areaBusyness,
  loadingAreaBusyness,
  canEdit,
  onFetchNow,
  onRefreshAreaBusyness,
}: Props) {
  return (
    <div className="space-y-4">
      {weather ? (
        <div className="bg-gradient-to-r from-[#6b5040] to-[#c9a27a] rounded-xl p-6 text-white shadow-[0_4px_20px_-4px_rgba(107,80,64,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cloud size={20} /> Thời tiết hôm nay — {weather.city}
              </h2>
              <p className="text-3xl font-bold mt-2">{weather.temperature.toFixed(1)}°C</p>
              <p className="text-white/80 capitalize">{weather.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt={weather.description}
                className="w-20 h-20"
              />
              {canEdit && (
                <button onClick={onFetchNow} className="p-2 bg-white/20 rounded-lg hover:bg-white/30" title="Cập nhật ngay">
                  <RefreshCw size={18} />
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2"><Thermometer size={16} /><span className="text-sm">Cảm giác: {weather.feelsLike.toFixed(1)}°C</span></div>
            <div className="flex items-center gap-2"><Droplets size={16} /><span className="text-sm">Độ ẩm: {weather.humidity}%</span></div>
            <div className="flex items-center gap-2"><Wind size={16} /><span className="text-sm">Gió: {weather.windSpeed} m/s</span></div>
            <div className="flex items-center gap-2"><Cloud size={16} /><span className="text-sm">Mưa: {weather.rainfall} mm</span></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[rgba(107,80,64,0.12)] p-8 text-center text-[rgba(26,14,7,0.4)] shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
          Chưa có dữ liệu thời tiết hôm nay
          {canEdit && (
            <button onClick={onFetchNow} className="ml-3 text-[#6b5040] hover:underline font-medium">Lấy ngay</button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[rgba(107,80,64,0.12)] p-6 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#1a0e07] flex items-center gap-2">
              <Activity size={18} className="text-[#c9a27a]" />
              Phân tích mật độ khu vực quanh quán
            </h3>
            <p className="text-sm text-[rgba(26,14,7,0.45)] mt-1">
              Dựa trên số lượng điểm dịch vụ/xung quanh để ước lượng khu vực đông hay thưa.
            </p>
          </div>
          <button
            onClick={onRefreshAreaBusyness}
            className="text-sm px-3 py-1.5 rounded-xl border border-[rgba(107,80,64,0.2)] text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.06)] transition-colors"
          >
            Làm mới
          </button>
        </div>

        {loadingAreaBusyness ? (
          <p className="text-sm text-[rgba(26,14,7,0.4)] mt-4">Đang phân tích...</p>
        ) : areaBusyness ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${BUSYNESS_STYLES[areaBusyness.level]}`}>
                {BUSYNESS_LABELS[areaBusyness.level]}
              </span>
              {areaBusyness.sourceType && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${SOURCE_TYPE_STYLES[areaBusyness.sourceType]}`}>
                  {SOURCE_TYPE_LABELS[areaBusyness.sourceType]}
                </span>
              )}
              <span className="text-sm text-[rgba(26,14,7,0.55)]">Điểm mật độ: {areaBusyness.score}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-[rgba(253,247,240,0.6)] border border-[rgba(107,80,64,0.08)] p-3">
                <p className="text-xs text-[rgba(26,14,7,0.45)]">POI tổng</p>
                <p className="text-lg font-semibold text-[#1a0e07]">{areaBusyness.poiCount}</p>
              </div>
              <div className="rounded-xl bg-[rgba(253,247,240,0.6)] border border-[rgba(107,80,64,0.08)] p-3">
                <p className="text-xs text-[rgba(26,14,7,0.45)]">Ăn uống</p>
                <p className="text-lg font-semibold text-[#1a0e07]">{areaBusyness.foodCount}</p>
              </div>
              <div className="rounded-xl bg-[rgba(253,247,240,0.6)] border border-[rgba(107,80,64,0.08)] p-3">
                <p className="text-xs text-[rgba(26,14,7,0.45)]">Giao thông</p>
                <p className="text-lg font-semibold text-[#1a0e07]">{areaBusyness.transitCount}</p>
              </div>
              <div className="rounded-xl bg-[rgba(253,247,240,0.6)] border border-[rgba(107,80,64,0.08)] p-3">
                <p className="text-xs text-[rgba(26,14,7,0.45)]">Thương mại</p>
                <p className="text-lg font-semibold text-[#1a0e07]">{areaBusyness.commerceCount}</p>
              </div>
            </div>

            <p className="text-sm text-[rgba(26,14,7,0.65)]">{areaBusyness.recommendation}</p>
            <p className="text-xs text-[rgba(26,14,7,0.4)] flex items-center gap-1">
              <MapPin size={12} />
              {areaBusyness.address || `${areaBusyness.latitude}, ${areaBusyness.longitude}`} · Nguồn: {areaBusyness.source}
            </p>
            <p className="text-xs text-[rgba(26,14,7,0.3)]">
              Cập nhật: {new Date(areaBusyness.analyzedAt).toLocaleString('vi-VN')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[rgba(26,14,7,0.4)] mt-4">
            Chưa có dữ liệu mật độ khu vực. Vào Cài đặt để nhập vị trí quán trước.
          </p>
        )}
      </div>

      {weatherRange.length > 1 && (
        <div className="bg-white rounded-xl border border-[rgba(107,80,64,0.12)] p-6 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
          <h3 className="text-lg font-semibold text-[#1a0e07] mb-4">Lịch sử thời tiết gần đây</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {weatherRange.map((w) => (
              <div key={w.id} className="border border-[rgba(107,80,64,0.1)] rounded-xl p-3 bg-[rgba(253,247,240,0.4)]">
                <p className="text-sm text-[rgba(26,14,7,0.45)]">{new Date(w.recordDate).toLocaleDateString('vi-VN')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <img src={`https://openweathermap.org/img/wn/${w.icon}.png`} alt="" className="w-8 h-8" />
                  <span className="text-lg font-bold text-[#1a0e07]">{w.temperature.toFixed(1)}°C</span>
                </div>
                <p className="text-xs text-[rgba(26,14,7,0.4)] capitalize">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
