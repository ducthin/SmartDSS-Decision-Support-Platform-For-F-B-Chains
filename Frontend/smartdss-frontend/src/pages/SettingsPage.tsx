import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { settingsService, resolveBackendUrl } from '@/services/settingsService';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey, getApiErrorMessage } from '@/utils/helpers';

export default function SettingsPage() {
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);
  const canManage = userRole === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [soundUrl, setSoundUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const resolvedUrl = useMemo(() => resolveBackendUrl(soundUrl), [soundUrl]);

  useEffect(() => {
    settingsService.getStaffCallSound()
      .then(res => setSoundUrl(res.data.data.soundUrl))
      .catch(() => setSoundUrl(null))
      .finally(() => setLoading(false));
  }, []);

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
        <p className="text-sm text-[#6D4C41] mt-1">Thiết lập hệ thống chung cho toàn bộ nhân viên.</p>
      </div>

      <div className="bg-white border border-[#E4CFB4] rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-800">Âm thanh “Gọi nhân viên” (QR)</h2>
            <p className="text-sm text-[#6D4C41] mt-1">
              File này sẽ được phát trên thiết bị nhân viên khi có khách gọi qua QR (khi đã bật thông báo).
            </p>
          </div>
          {soundUrl && (
            <button
              onClick={clearSound}
              className="text-sm px-3 py-1.5 rounded-md border border-[#E4CFB4] hover:bg-[#FDF6EC]"
            >
              Xóa
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-[#6D4C41]">Đang tải...</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-[#6D4C41]">Trạng thái:</span>{' '}
              {soundUrl ? (
                <span className="font-medium text-green-700">Đã cấu hình</span>
              ) : (
                <span className="font-medium text-[#5D4037]">Chưa cấu hình (dùng beep mặc định)</span>
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
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#FFF4E3] file:text-[#D48806] hover:file:bg-[#FFE7CC]"
              />
              {uploading && <span className="text-sm text-[#6D4C41]">Đang upload...</span>}
            </div>

            {!canManage && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Chỉ ADMIN mới được thay đổi âm thanh.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



