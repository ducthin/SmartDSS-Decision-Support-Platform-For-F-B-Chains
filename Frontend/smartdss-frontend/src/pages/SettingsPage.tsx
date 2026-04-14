import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { settingsService, resolveBackendUrl } from '@/services/settingsService';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey, getApiErrorMessage } from '@/utils/helpers';
import type { StoreLocationUpdate } from '@/types';
import MapPickerModal from '@/components/settings/MapPickerModal';

export default function SettingsPage() {
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);
  const canManage = userRole === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [soundUrl, setSoundUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [savingLocation, setSavingLocation] = useState(false);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationForm, setLocationForm] = useState<{
    latitude: string;
    longitude: string;
    address: string;
  }>({ latitude: '', longitude: '', address: '' });

  const resolvedUrl = useMemo(() => resolveBackendUrl(soundUrl), [soundUrl]);

  useEffect(() => {
    settingsService.getStaffCallSound()
      .then(res => setSoundUrl(res.data.data.soundUrl))
      .catch(() => setSoundUrl(null))
      .finally(() => setLoading(false));

    settingsService.getStoreLocation()
      .then((res) => {
        const data = res.data.data;
        setLocationForm({
          latitude: data.latitude == null ? '' : String(data.latitude),
          longitude: data.longitude == null ? '' : String(data.longitude),
          address: data.address ?? '',
        });
      })
      .catch(() => {
        setLocationForm({ latitude: '', longitude: '', address: '' });
      })
      .finally(() => setLocationLoading(false));
  }, []);

  const fetchStoreLocation = async (silent = false) => {
    if (!silent) setVerifyingLocation(true);
    try {
      const res = await settingsService.getStoreLocation();
      const data = res.data.data;
      setLocationForm({
        latitude: data.latitude == null ? '' : String(data.latitude),
        longitude: data.longitude == null ? '' : String(data.longitude),
        address: data.address ?? '',
      });
      setLastVerifiedAt(new Date().toISOString());
      return data;
    } finally {
      if (!silent) setVerifyingLocation(false);
    }
  };

  const saveLocation = async () => {
    if (!canManage) return toast.error('Không có quyền');

    const latText = locationForm.latitude.trim();
    const lngText = locationForm.longitude.trim();
    const hasLat = latText.length > 0;
    const hasLng = lngText.length > 0;

    if (hasLat !== hasLng) {
      toast.error('Vui lòng nhập đủ cả vĩ độ và kinh độ');
      return;
    }

    let latitude: number | null = null;
    let longitude: number | null = null;

    if (hasLat && hasLng) {
      latitude = Number(latText);
      longitude = Number(lngText);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        toast.error('Vĩ độ/kinh độ phải là số hợp lệ');
        return;
      }
    }

    const payload: StoreLocationUpdate = {
      latitude,
      longitude,
      address: locationForm.address.trim() || null,
    };

    setSavingLocation(true);
    try {
      const res = await settingsService.updateStoreLocation(payload);
      const data = res.data.data;
      setLocationForm({
        latitude: data.latitude == null ? '' : String(data.latitude),
        longitude: data.longitude == null ? '' : String(data.longitude),
        address: data.address ?? '',
      });
      await fetchStoreLocation(true);
      toast.success('Đã lưu vị trí quán (đã xác minh)');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Không thể lưu vị trí quán'));
    } finally {
      setSavingLocation(false);
    }
  };

  const parseLatLng = () => {
    const lat = Number(locationForm.latitude.trim());
    const lng = Number(locationForm.longitude.trim());
    const latOk = Number.isFinite(lat) && Math.abs(lat) <= 90;
    const lngOk = Number.isFinite(lng) && Math.abs(lng) <= 180;
    if (!latOk || !lngOk) return { latitude: null, longitude: null };
    return { latitude: lat, longitude: lng };
  };

  const openExternalMap = () => {
    const { latitude, longitude } = parseLatLng();
    const query = latitude != null && longitude != null
      ? `${latitude},${longitude}`
      : (locationForm.address.trim() || 'Da Nang');
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  const onPickFile = async (file?: File | null) => {
    if (!file) return;
    if (!canManage) return toast.error('Không có quyền');
    setUploading(true);
    try {
      const res = await settingsService.uploadStaffCallSound(file);
      setSoundUrl(res.data.data.soundUrl);
      toast.success('Cập nhật âm thanh thành công');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Upload thất bại'));
    } finally {
      setUploading(false);
    }
  };

  const clearSound = async () => {
    if (!canManage) return toast.error('Không có quyền');
    try {
      await settingsService.clearStaffCallSound();
      setSoundUrl(null);
      toast.success('Đã xóa âm thanh');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Không thể xóa'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-sm text-gray-500 mt-1">Thiết lập hệ thống chung cho toàn bộ nhân viên.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-800">Âm thanh “Gọi nhân viên” (QR)</h2>
            <p className="text-sm text-gray-500 mt-1">
              File này sẽ được phát trên thiết bị nhân viên khi có khách gọi qua QR (khi đã bật thông báo).
            </p>
          </div>
          {soundUrl && (
            <button
              onClick={clearSound}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
            >
              Xóa
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Đang tải...</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">Trạng thái:</span>{' '}
              {soundUrl ? (
                <span className="font-medium text-green-700">Đã cấu hình</span>
              ) : (
                <span className="font-medium text-gray-600">Chưa cấu hình (dùng beep mặc định)</span>
              )}
            </div>

            {resolvedUrl && (
              <audio controls src={resolvedUrl} className="w-full" />
            )}

            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="audio/*"
                disabled={!canManage || uploading}
                onChange={(e) => onPickFile(e.target.files?.[0])}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && <span className="text-sm text-gray-500">Đang upload...</span>}
            </div>

            {!canManage && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Chỉ ADMIN mới được thay đổi âm thanh.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Vị trí quán để phân tích khu vực</h2>
          <p className="text-sm text-gray-500 mt-1">
            Nhập tọa độ quán để hệ thống ước lượng khu vực đông/không đông và hỗ trợ quyết định vận hành.
          </p>
        </div>

        {locationLoading ? (
          <div className="text-sm text-gray-500">Đang tải...</div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Vĩ độ (Latitude)</label>
                <input
                  type="text"
                  value={locationForm.latitude}
                  onChange={(e) => setLocationForm((p) => ({ ...p, latitude: e.target.value }))}
                  disabled={!canManage || savingLocation}
                  placeholder="Ví dụ: 16.0748"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Kinh độ (Longitude)</label>
                <input
                  type="text"
                  value={locationForm.longitude}
                  onChange={(e) => setLocationForm((p) => ({ ...p, longitude: e.target.value }))}
                  disabled={!canManage || savingLocation}
                  placeholder="Ví dụ: 108.2240"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Địa chỉ mô tả</label>
              <input
                type="text"
                value={locationForm.address}
                onChange={(e) => setLocationForm((p) => ({ ...p, address: e.target.value }))}
                disabled={!canManage || savingLocation}
                placeholder="Ví dụ: 123 Trần Phú, Hải Châu, Đà Nẵng"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMapPicker(true)}
                disabled={!canManage || savingLocation}
                className="text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Chọn trên bản đồ
              </button>
              <button
                onClick={openExternalMap}
                className="text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Mở Google Maps
              </button>
              <button
                onClick={saveLocation}
                disabled={!canManage || savingLocation}
                className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingLocation ? 'Đang lưu...' : 'Lưu vị trí'}
              </button>
              <button
                onClick={() => {
                  fetchStoreLocation()
                    .then(() => toast.success('Đã kiểm tra dữ liệu lưu'))
                    .catch((e) => toast.error(getApiErrorMessage(e, 'Không thể kiểm tra dữ liệu lưu')));
                }}
                disabled={verifyingLocation}
                className="text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                {verifyingLocation ? 'Đang kiểm tra...' : 'Kiểm tra lưu'}
              </button>
            </div>
            <span className="text-xs text-gray-500">
              Bạn có thể bấm vào map để lấy chính xác vĩ độ/kinh độ, sau đó lưu để dùng cho phân tích mật độ khu vực.
            </span>
            {lastVerifiedAt && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                Dữ liệu vị trí đã xác minh lúc {new Date(lastVerifiedAt).toLocaleString('vi-VN')}.
              </p>
            )}

            {!canManage && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Chỉ ADMIN mới được thay đổi vị trí quán.
              </div>
            )}
          </div>
        )}
      </div>

      {showMapPicker && (
        <MapPickerModal
          initialLatitude={parseLatLng().latitude}
          initialLongitude={parseLatLng().longitude}
          onClose={() => setShowMapPicker(false)}
          onConfirm={(latitude, longitude) => {
            setLocationForm((p) => ({
              ...p,
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6),
            }));
            setShowMapPicker(false);
            toast.success('Đã lấy tọa độ từ bản đồ');
          }}
        />
      )}
    </div>
  );
}

