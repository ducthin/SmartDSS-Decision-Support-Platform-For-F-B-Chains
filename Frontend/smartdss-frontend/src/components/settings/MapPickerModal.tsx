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
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.7,
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
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Chọn vị trí quán trên bản đồ</h3>
            <p className="text-xs text-gray-500 mt-1">Bấm trực tiếp lên bản đồ để lấy vĩ độ/kinh độ.</p>
          </div>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
            Đóng
          </button>
        </div>

        <div ref={mapElRef} className="h-[420px] w-full" />

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Đã chọn:</span> {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
          </div>
          <button
            onClick={() => onConfirm(selected.lat, selected.lng)}
            className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Dùng tọa độ này
          </button>
        </div>
      </div>
    </div>
  );
}
