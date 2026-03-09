import { Cloud, Droplets, Wind, Thermometer, RefreshCw } from 'lucide-react';
import type { WeatherData } from '@/types';

interface Props {
  weather: WeatherData | null;
  weatherRange: WeatherData[];
  canEdit: boolean;
  onFetchNow: () => void;
}

export default function WeatherTab({ weather, weatherRange, canEdit, onFetchNow }: Props) {
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
