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
  REALTIME: 'bg-blue-100 text-blue-700',
  CACHE: 'bg-slate-100 text-slate-700',
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
        <div className="bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
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
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Chưa có dữ liệu thời tiết hôm nay
          {canEdit && (
            <button onClick={onFetchNow} className="ml-3 text-blue-600 hover:underline">Lấy ngay</button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity size={18} />
              Phân tích mật độ khu vực quanh quán
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Dựa trên số lượng điểm dịch vụ/xung quanh để ước lượng khu vực đông hay thưa.
            </p>
          </div>
          <button
            onClick={onRefreshAreaBusyness}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
          >
            Làm mới
          </button>
        </div>

        {loadingAreaBusyness ? (
          <p className="text-sm text-gray-500 mt-4">Đang phân tích...</p>
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
              <span className="text-sm text-gray-600">Điểm mật độ: {areaBusyness.score}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">POI tổng</p>
                <p className="text-lg font-semibold">{areaBusyness.poiCount}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Ăn uống</p>
                <p className="text-lg font-semibold">{areaBusyness.foodCount}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Giao thông</p>
                <p className="text-lg font-semibold">{areaBusyness.transitCount}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Thương mại</p>
                <p className="text-lg font-semibold">{areaBusyness.commerceCount}</p>
              </div>
            </div>

            <p className="text-sm text-gray-700">{areaBusyness.recommendation}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={12} />
              {areaBusyness.address || `${areaBusyness.latitude}, ${areaBusyness.longitude}`} · Nguồn: {areaBusyness.source}
            </p>
            <p className="text-xs text-gray-400">
              Cập nhật: {new Date(areaBusyness.analyzedAt).toLocaleString('vi-VN')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-4">
            Chưa có dữ liệu mật độ khu vực. Vào Cài đặt để nhập vị trí quán trước.
          </p>
        )}
      </div>

      {weatherRange.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Lịch sử thời tiết gần đây</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {weatherRange.map((w) => (
              <div key={w.id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-500">{new Date(w.recordDate).toLocaleDateString('vi-VN')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <img src={`https://openweathermap.org/img/wn/${w.icon}.png`} alt="" className="w-8 h-8" />
                  <span className="text-lg font-bold">{w.temperature.toFixed(1)}°C</span>
                </div>
                <p className="text-xs text-gray-400 capitalize">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
