import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onClose: () => void;
  onConfirm: (latitude: number, longitude: number) => void;
}

export default function MapPickerModal({
  initialLatitude,
  initialLongitude,
  onClose,
  onConfirm,
}: Props) {
  const fallbackCenter: [number, number] = [16.0544, 108.2022]; // Da Nang
  const startCenter = useMemo<[number, number]>(() => {
    if (initialLatitude == null || initialLongitude == null) return fallbackCenter;
    return [initialLatitude, initialLongitude];
  }, [initialLatitude, initialLongitude]);

  const [selected, setSelected] = useState<{ lat: number; lng: number }>(() => ({
    lat: startCenter[0],
    lng: startCenter[1],
  }));
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current).setView(startCenter, 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.circleMarker(startCenter, {
      radius: 10,
      color: '#6b5040',
      fillColor: '#c9a27a',
      fillOpacity: 0.8,
    }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;
      setSelected({ lat, lng });
      marker.setLatLng([lat, lng]);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [startCenter]);

  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng([selected.lat, selected.lng]);
  }, [selected]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-[0_20px_60px_-10px_rgba(26,14,7,0.2)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(107,80,64,0.08)] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#1a0e07]">Chọn vị trí quán trên bản đồ</h3>
            <p className="text-xs text-[rgba(26,14,7,0.45)] mt-1">Bấm trực tiếp lên bản đồ để lấy vĩ độ/kinh độ.</p>
          </div>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-xl border border-[rgba(107,80,64,0.2)] text-[rgba(26,14,7,0.7)] hover:bg-[rgba(107,80,64,0.06)] transition-colors"
          >
            Đóng
          </button>
        </div>

        <div ref={mapElRef} className="h-[420px] w-full" />

        <div className="px-4 py-3 border-t border-[rgba(107,80,64,0.08)] flex items-center justify-between gap-3">
          <div className="text-sm text-[rgba(26,14,7,0.65)]">
            <span className="font-semibold text-[#1a0e07]">Đã chọn:</span>{' '}
            {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
          </div>
          <button
            onClick={() => onConfirm(selected.lat, selected.lng)}
            className="text-sm px-4 py-2 rounded-xl bg-[#6b5040] text-white hover:brightness-110 transition-all shadow-sm"
          >
            Dùng tọa độ này
          </button>
        </div>
      </div>
    </div>
  );
}
