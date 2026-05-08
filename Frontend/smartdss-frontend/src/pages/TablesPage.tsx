import '@/styles/coffee-theme.css';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, QrCode, RefreshCw, X, Download, Copy, CheckCircle, XCircle } from 'lucide-react';
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

  const openCreate = () => { setEditing(null); setForm({ name: '', active: true }); setShowModal(true); };
  const openEdit = (t: DiningTable) => { setEditing(t); setForm({ name: t.name, active: t.active }); setShowModal(true); };

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
    canvas.width = 400; canvas.height = 400;
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0e07]">Quản lý QR Bàn</h1>
          <p className="mt-0.5 text-sm text-[rgba(26,14,7,0.5)]">Tạo và quản lý mã QR cho từng bàn</p>
        </div>
        {canEdit && (
          <button
            id="table-add-btn"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6b5040] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(107,80,64,0.5)] transition hover:brightness-110 active:scale-95"
          >
            <Plus size={16} /> Thêm bàn
          </button>
        )}
      </div>

      {/* Tables grid */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[rgba(107,80,64,0.06)]">
            <QrCode size={36} className="text-[rgba(107,80,64,0.3)]" />
          </div>
          <p className="text-base font-semibold text-[rgba(26,14,7,0.5)]">Chưa có bàn nào</p>
          <p className="mt-1 text-sm text-[rgba(26,14,7,0.35)]">Nhấn "Thêm bàn" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(t => (
            <div
              key={t.id}
              className={`group relative overflow-hidden rounded-2xl border bg-white shadow-[0_2px_12px_-4px_rgba(26,14,7,0.08)] transition-all hover:shadow-[0_8px_28px_-8px_rgba(26,14,7,0.14)] hover:-translate-y-0.5 ${
                t.active
                  ? 'border-[rgba(107,80,64,0.12)]'
                  : 'border-[rgba(107,80,64,0.08)] opacity-60'
              }`}
            >
              {/* Top accent */}


              <div className="p-4">
                {/* Table name + status */}
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-[#1a0e07]">{t.name}</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                    {t.active ? 'Hoạt động' : 'Tắt'}
                  </span>
                </div>

                {/* QR Preview — click to expand */}
                <div
                  className="flex cursor-pointer justify-center rounded-xl bg-[rgba(253,247,240,0.8)] p-3 mb-3 transition hover:bg-[rgba(201,162,122,0.08)]"
                  onClick={() => setShowQr(t)}
                  title="Nhấn để xem QR lớn"
                >
                  <QRCodeSVG value={getQrUrl(t)} size={110} level="M" />
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setShowQr(t)}
                    title="Xem QR"
                    className="rounded-lg p-2 text-[rgba(107,80,64,0.6)] hover:bg-[rgba(201,162,122,0.12)] hover:text-[#6b5040] transition-colors"
                  >
                    <QrCode size={15} />
                  </button>
                  <button
                    onClick={() => copyQrUrl(t)}
                    title="Sao chép link"
                    className="rounded-lg p-2 text-[rgba(107,80,64,0.6)] hover:bg-[rgba(201,162,122,0.12)] hover:text-[#6b5040] transition-colors"
                  >
                    <Copy size={15} />
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => openEdit(t)}
                        title="Sửa"
                        className="rounded-lg p-2 text-[rgba(107,80,64,0.6)] hover:bg-amber-50 hover:text-amber-700 transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => regenerateQr(t.id)}
                        title="Tạo QR mới"
                        className="rounded-lg p-2 text-[rgba(107,80,64,0.6)] hover:bg-violet-50 hover:text-violet-600 transition-colors"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        onClick={() => deleteTable(t.id)}
                        title="Xóa"
                        className="rounded-lg p-2 text-[rgba(239,68,68,0.5)] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pageData && pageData.totalPages > 1 && (
        <div className="pt-2 flex justify-end">
          <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,14,7,0.55)] backdrop-blur-[2px]">
          <div className="w-full max-w-md mx-4 overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-16px_rgba(26,14,7,0.35)]">

            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#1a0e07]">{editing ? 'Sửa bàn' : 'Thêm bàn mới'}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1.5 text-[rgba(26,14,7,0.4)] hover:bg-[rgba(107,80,64,0.06)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1a0e07] mb-1.5">Tên bàn</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="VD: Bàn 1, Bàn VIP..."
                    className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.15)]"
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                    className="h-4 w-4 rounded border-[rgba(107,80,64,0.3)] accent-[#6b5040]"
                  />
                  <span className="text-sm font-medium text-[#1a0e07]">Hoạt động</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-[rgba(107,80,64,0.18)] px-4 py-2.5 text-sm font-medium text-[#6b5040] transition hover:bg-[rgba(107,80,64,0.05)]"
                >
                  Hủy
                </button>
                <button
                  onClick={save}
                  className="rounded-xl bg-[#6b5040] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Detail Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,14,7,0.55)] backdrop-blur-[2px]">
          <div className="w-full max-w-sm mx-4 overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-16px_rgba(26,14,7,0.35)] text-center">

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1a0e07]">Mã QR — {showQr.name}</h2>
                <button
                  onClick={() => setShowQr(null)}
                  className="rounded-lg p-1.5 text-[rgba(26,14,7,0.4)] hover:bg-[rgba(107,80,64,0.06)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div ref={qrRef} className="flex justify-center rounded-xl bg-[rgba(253,247,240,0.8)] p-4 mb-4">
                <QRCodeSVG value={getQrUrl(showQr)} size={220} level="H" includeMargin />
              </div>
              <p className="text-[11px] text-[rgba(26,14,7,0.35)] break-all mb-5 px-2">{getQrUrl(showQr)}</p>
              <div className="flex gap-2.5 justify-center">
                <button
                  onClick={() => copyQrUrl(showQr)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(107,80,64,0.18)] px-4 py-2.5 text-sm font-medium text-[#6b5040] transition hover:bg-[rgba(107,80,64,0.05)]"
                >
                  <Copy size={14} /> Sao chép link
                </button>
                <button
                  onClick={downloadQr}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#6b5040] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  <Download size={14} /> Tải QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
