import { useCallback, useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, QrCode, RefreshCw, X, Download, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';
import { getApiErrorMessage } from '@/utils/helpers';
import { tableService } from '@/services/tableService';
import Pagination from '@/components/ui/Pagination';
import type { DiningTable, DiningTableForm, PageResponse } from '@/types';

export default function TablesPage() {
  const { user } = useAuth();
  const role = getRoleKey(user?.roleName);
  const canEdit = role === 'ADMIN' || role === 'MANAGER';

  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DiningTable | null>(null);
  const [form, setForm] = useState<DiningTableForm>({ name: '', active: true });
  const [showQr, setShowQr] = useState<DiningTable | null>(null);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<DiningTable> | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const frontendUrl = window.location.origin;

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tableService.getAll(page, 12);
      setTables(res.data.data.content);
      setPageData(res.data.data);
    } catch (error) { toast.error(getApiErrorMessage(error, 'Lỗi tải danh sách bàn')); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', active: true });
    setShowModal(true);
  };

  const openEdit = (t: DiningTable) => {
    setEditing(t);
    setForm({ name: t.name, active: t.active });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Tên bàn không được để trống'); return; }
    try {
      if (editing) {
        await tableService.update(editing.id, form);
        toast.success('Cập nhật bàn thành công');
      } else {
        await tableService.create(form);
        toast.success('Tạo bàn thành công');
      }
      setShowModal(false);
      fetchTables();
    } catch (error) { toast.error(getApiErrorMessage(error, 'Lỗi lưu bàn')); }
  };

  const deleteTable = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa bàn này?')) return;
    try {
      await tableService.delete(id);
      toast.success('Đã xóa bàn');
      fetchTables();
    } catch (error) { toast.error(getApiErrorMessage(error, 'Lỗi xóa bàn')); }
  };

  const regenerateQr = async (id: number) => {
    if (!confirm('Tạo mã QR mới? Mã cũ sẽ không còn hoạt động.')) return;
    try {
      await tableService.regenerateQr(id);
      toast.success('Đã tạo mã QR mới');
      fetchTables();
    } catch (error) { toast.error(getApiErrorMessage(error, 'Lỗi tạo mã QR')); }
  };

  const getQrUrl = (t: DiningTable) => `${frontendUrl}/qr/${t.qrToken}`;

  const copyQrUrl = (t: DiningTable) => {
    navigator.clipboard.writeText(getQrUrl(t));
    toast.success('Đã sao chép liên kết');
  };

  const downloadQr = () => {
    if (!qrRef.current || !showQr) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `QR-${showQr.name}.png`;
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý bàn</h1>
          <p className="text-gray-500 text-sm mt-1">Tạo và quản lý mã QR cho từng bàn</p>
        </div>
        {canEdit && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" /> Thêm bàn
          </button>
        )}
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map(t => (
          <div key={t.id} className={`bg-white rounded-xl shadow-sm border-2 p-4 ${t.active ? 'border-green-200' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-gray-800">{t.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.active ? 'Hoạt động' : 'Tắt'}
              </span>
            </div>

            {/* QR Preview */}
            <div className="flex justify-center mb-3 cursor-pointer" onClick={() => setShowQr(t)}>
              <QRCodeSVG value={getQrUrl(t)} size={120} level="M" />
            </div>

            <div className="flex gap-1 justify-center">
              <button onClick={() => setShowQr(t)} title="Xem QR"
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition">
                <QrCode className="h-4 w-4" />
              </button>
              <button onClick={() => copyQrUrl(t)} title="Sao chép link"
                className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition">
                <Copy className="h-4 w-4" />
              </button>
              {canEdit && (
                <>
                  <button onClick={() => openEdit(t)} title="Sửa"
                    className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => regenerateQr(t.id)} title="Tạo QR mới"
                    className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteTable(t.id)} title="Xóa"
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <QrCode className="mx-auto h-16 w-16 mb-4" />
          <p className="text-lg">Chưa có bàn nào</p>
          <p className="text-sm mt-1">Nhấn "Thêm bàn" để bắt đầu</p>
        </div>
      )}

      {pageData && pageData.totalPages > 1 && (
        <div className="py-4 flex justify-end">
          <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">{editing ? 'Sửa bàn' : 'Thêm bàn mới'}</h2>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên bàn</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Bàn 1, Bàn VIP..."
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active}
                  onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Hoạt động</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Hủy</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Detail Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Mã QR - {showQr.name}</h2>
              <button onClick={() => setShowQr(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div ref={qrRef} className="flex justify-center mb-4">
              <QRCodeSVG value={getQrUrl(showQr)} size={250} level="H" includeMargin />
            </div>
            <p className="text-xs text-gray-400 break-all mb-4">{getQrUrl(showQr)}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => copyQrUrl(showQr)}
                className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                <Copy className="h-4 w-4" /> Sao chép link
              </button>
              <button onClick={downloadQr}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="h-4 w-4" /> Tải QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
