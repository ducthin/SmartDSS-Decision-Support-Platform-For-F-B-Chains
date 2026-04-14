import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { feedbackService } from '@/services/feedbackService';
import { resolveBackendUrl } from '@/services/settingsService';
import type { CustomerFeedback, FeedbackStats, FeedbackStatus, PageResponse } from '@/types';
import { getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { ChevronLeft, ChevronRight, MessageSquareText, Search, Star, X } from 'lucide-react';

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: 'Mới',
  IN_REVIEW: 'Đang xử lý',
  RESOLVED: 'Đã xử lý',
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
};

export default function FeedbacksPage() {
  const [items, setItems] = useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<CustomerFeedback> | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | ''>('');
  const [filterRating, setFilterRating] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [draftById, setDraftById] = useState<Record<number, { status: FeedbackStatus; internalNote: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feedbackService.getAll(page, 10, {
        status: filterStatus || undefined,
        rating: filterRating === '' ? undefined : filterRating,
        keyword: keyword || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      const data = res.data.data;
      const list = data.content || [];
      setItems(list);
      setDraftById((prev) => {
        const next = { ...prev };
        list.forEach((item) => {
          if (!next[item.id]) {
            next[item.id] = {
              status: item.status,
              internalNote: item.internalNote || '',
            };
          }
        });
        return next;
      });
      setPageData(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải feedback khách hàng'));
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterRating, keyword, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    feedbackService.getStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {
        // keep page usable even if stats API fails
      });
  }, []);

  const closePreview = () => {
    setPreviewIndex(null);
    setPreviewUrls([]);
  };

  const saveStatus = async (id: number) => {
    const draft = draftById[id];
    if (!draft) return;
    setSavingId(id);
    try {
      const res = await feedbackService.updateStatus(id, draft.status, draft.internalNote || undefined);
      const updated = res.data.data;
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
      setDraftById((prev) => ({
        ...prev,
        [id]: { status: updated.status, internalNote: updated.internalNote || '' },
      }));
      feedbackService.getStats().then((s) => setStats(s.data.data)).catch(() => undefined);
      toast.success('Cập nhật trạng thái thành công');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái feedback'));
    } finally {
      setSavingId(null);
    }
  };

  const applyFilter = () => {
    setPage(0);
    load();
  };

  const clearFilter = () => {
    setKeyword('');
    setFilterStatus('');
    setFilterRating('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const activePreviewUrl = previewIndex !== null ? previewUrls[previewIndex] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feedback khách hàng</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Tổng feedback</div>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-3">
            <div className="text-xs text-blue-600">Mới</div>
            <div className="text-xl font-bold text-blue-700">{stats.newCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-3">
            <div className="text-xs text-amber-600">Đang xử lý</div>
            <div className="text-xl font-bold text-amber-700">{stats.inReviewCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-3">
            <div className="text-xs text-green-600">Đã xử lý</div>
            <div className="text-xl font-bold text-green-700">{stats.resolvedCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-rose-200 p-3">
            <div className="text-xs text-rose-600">Feedback xấu (&lt;=2 sao)</div>
            <div className="text-xl font-bold text-rose-700">{stats.lowRatingCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-indigo-200 p-3">
            <div className="text-xs text-indigo-600">Hôm nay</div>
            <div className="text-xl font-bold text-indigo-700">{stats.todayCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Điểm trung bình</div>
            <div className="text-xl font-bold text-gray-900">{stats.averageRating.toFixed(2)}/5</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên khách/nội dung/bàn..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus((e.target.value as FeedbackStatus | '') || '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="NEW">Mới</option>
          <option value="IN_REVIEW">Đang xử lý</option>
          <option value="RESOLVED">Đã xử lý</option>
        </select>
        <select
          value={filterRating}
          onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tất cả số sao</option>
          {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} sao</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={applyFilter} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Lọc</button>
          <button onClick={clearFilter} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Xóa lọc</button>
        </div>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <MessageSquareText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>Chưa có feedback nào từ khách hàng.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => {
            const urls = (item.imageUrls && item.imageUrls.length > 0)
              ? item.imageUrls
              : item.imageUrl
                ? [item.imageUrl]
                : [];
            return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{item.customerName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.customerPhone} - {item.customerEmail}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Bàn: {item.tableName} - {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} className="fill-amber-400" />
                  <span className="font-semibold text-sm">{item.rating}/5</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                <span className="text-xs text-gray-400">#{item.id}</span>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>

              {urls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {urls.map((url, idx) => (
                    <button
                      key={`${item.id}-${idx}`}
                      onClick={() => {
                        setPreviewUrls(urls.map((u) => resolveBackendUrl(u) || u));
                        setPreviewIndex(idx);
                      }}
                      className="rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition"
                    >
                      <img
                        src={resolveBackendUrl(url) ?? ''}
                        alt={`Feedback attachment ${idx + 1}`}
                        className="w-full h-28 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={draftById[item.id]?.status || item.status}
                    onChange={(e) => setDraftById((prev) => ({
                      ...prev,
                      [item.id]: {
                        status: e.target.value as FeedbackStatus,
                        internalNote: prev[item.id]?.internalNote ?? item.internalNote ?? '',
                      },
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="NEW">Mới</option>
                    <option value="IN_REVIEW">Đang xử lý</option>
                    <option value="RESOLVED">Đã xử lý</option>
                  </select>
                  <button
                    onClick={() => saveStatus(item.id)}
                    disabled={savingId === item.id}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingId === item.id ? 'Đang lưu...' : 'Lưu trạng thái'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={draftById[item.id]?.internalNote ?? item.internalNote ?? ''}
                  onChange={(e) => setDraftById((prev) => ({
                    ...prev,
                    [item.id]: {
                      status: prev[item.id]?.status ?? item.status,
                      internalNote: e.target.value,
                    },
                  }))}
                  placeholder="Ghi chú nội bộ (chỉ Admin/Manager thấy)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>
            );
          })}
        </div>
      )}

      {activePreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <button onClick={closePreview} className="absolute inset-0" aria-label="Close image preview" />
          <div className="relative z-10 max-w-5xl w-full flex items-center justify-center">
            <button
              onClick={closePreview}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
              title="Đóng"
            >
              <X size={18} />
            </button>

            {previewUrls.length > 1 && previewIndex !== null && (
              <button
                onClick={() => setPreviewIndex((prev) => (prev === null ? 0 : (prev - 1 + previewUrls.length) % previewUrls.length))}
                className="absolute left-2 md:left-4 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
                title="Ảnh trước"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <img
              src={activePreviewUrl}
              alt="Feedback preview"
              className="max-h-[85vh] max-w-full object-contain rounded-lg border border-white/20"
            />

            {previewUrls.length > 1 && previewIndex !== null && (
              <button
                onClick={() => setPreviewIndex((prev) => (prev === null ? 0 : (prev + 1) % previewUrls.length))}
                className="absolute right-2 md:right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
                title="Ảnh sau"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      {pageData && (
        <Pagination
          page={page}
          totalPages={pageData.totalPages}
          totalElements={pageData.totalElements}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
