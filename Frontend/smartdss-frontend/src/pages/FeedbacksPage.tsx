import '@/styles/coffee-theme.css';
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
  NEW: 'bg-[rgba(201,162,122,0.15)] text-[#7a5c3e] border border-[rgba(201,162,122,0.35)]',
  IN_REVIEW: 'bg-amber-50 text-amber-700 border border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const inputCls =
  'px-3 py-2 border border-[rgba(107,80,64,0.18)] rounded-xl text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)] bg-white';

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0e07]">Feedback khách hàng</h1>
          <p className="mt-0.5 text-sm text-[rgba(26,14,7,0.5)]">Theo dõi và xử lý phản hồi từ khách hàng</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white rounded-xl border border-[rgba(107,80,64,0.1)] p-3 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)]">
            <div className="text-xs text-[rgba(26,14,7,0.45)]">Tổng feedback</div>
            <div className="text-xl font-bold text-[#1a0e07]">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-[rgba(201,162,122,0.3)] p-3 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)]">
            <div className="text-xs text-[#7a5c3e]">Mới</div>
            <div className="text-xl font-bold text-[#6b5040]">{stats.newCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-3 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)]">
            <div className="text-xs text-amber-600">Đang xử lý</div>
            <div className="text-xl font-bold text-amber-700">{stats.inReviewCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-3 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)]">
            <div className="text-xs text-emerald-600">Đã xử lý</div>
            <div className="text-xl font-bold text-emerald-700">{stats.resolvedCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-rose-200 p-3 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)]">
            <div className="text-xs text-rose-600">Feedback xấu (&lt;=2 sao)</div>
            <div className="text-xl font-bold text-rose-700">{stats.lowRatingCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-[rgba(107,80,64,0.1)] p-3 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)]">
            <div className="text-xs text-[rgba(26,14,7,0.45)]">Hôm nay</div>
            <div className="text-xl font-bold text-[#1a0e07]">{stats.todayCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-[rgba(107,80,64,0.1)] p-3 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)]">
            <div className="text-xs text-[rgba(26,14,7,0.45)]">Điểm trung bình</div>
            <div className="text-xl font-bold text-[#1a0e07]">{stats.averageRating.toFixed(2)}/5</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[rgba(107,80,64,0.1)] rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên khách/nội dung/bàn..."
              className={`w-full pl-9 pr-3 ${inputCls}`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus((e.target.value as FeedbackStatus | '') || '')}
            className={inputCls}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="NEW">Mới</option>
            <option value="IN_REVIEW">Đang xử lý</option>
            <option value="RESOLVED">Đã xử lý</option>
          </select>
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : '')}
            className={inputCls}
          >
            <option value="">Tất cả số sao</option>
            {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} sao</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={applyFilter} className="flex-1 px-3 py-2 bg-[#6b5040] text-white rounded-xl text-sm font-medium hover:brightness-110 transition active:scale-95">Lọc</button>
            <button onClick={clearFilter} className="flex-1 px-3 py-2 border border-[rgba(107,80,64,0.18)] rounded-xl text-sm text-[#6b5040] hover:bg-[rgba(107,80,64,0.05)] transition">Xóa lọc</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 max-w-sm">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-[rgba(26,14,7,0.35)]">
          <MessageSquareText size={44} className="text-[rgba(107,80,64,0.2)]" />
          <p className="text-sm">Chưa có feedback nào từ khách hàng.</p>
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
              <div key={item.id} className="bg-white rounded-2xl border border-[rgba(107,80,64,0.1)] p-4 space-y-3 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(26,14,7,0.1)] transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#1a0e07]">{item.customerName}</div>
                    <div className="text-xs text-[rgba(26,14,7,0.5)] mt-0.5">
                      {item.customerPhone} - {item.customerEmail}
                    </div>
                    <div className="text-xs text-[rgba(26,14,7,0.35)] mt-1">
                      Bàn: {item.tableName} · {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 shrink-0">
                    <Star size={16} className="fill-amber-400" />
                    <span className="font-semibold text-sm">{item.rating}/5</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                  <span className="text-xs text-[rgba(26,14,7,0.35)]">#{item.id}</span>
                </div>

                <p className="text-sm text-[rgba(26,14,7,0.75)] whitespace-pre-wrap">{item.content}</p>

                {urls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {urls.map((url, idx) => (
                      <button
                        key={`${item.id}-${idx}`}
                        onClick={() => {
                          setPreviewUrls(urls.map((u) => resolveBackendUrl(u) || u));
                          setPreviewIndex(idx);
                        }}
                        className="rounded-xl overflow-hidden border border-[rgba(107,80,64,0.1)] hover:opacity-90 transition"
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

                <div className="space-y-2 pt-1 border-t border-[rgba(107,80,64,0.07)]">
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
                      className={inputCls}
                    >
                      <option value="NEW">Mới</option>
                      <option value="IN_REVIEW">Đang xử lý</option>
                      <option value="RESOLVED">Đã xử lý</option>
                    </select>
                    <button
                      onClick={() => saveStatus(item.id)}
                      disabled={savingId === item.id}
                      className="px-3 py-2 bg-[#6b5040] text-white rounded-xl text-sm font-medium hover:brightness-110 disabled:opacity-60 transition"
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
                    className="w-full border border-[rgba(107,80,64,0.18)] rounded-xl px-3 py-2 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)] resize-none bg-white"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image preview overlay */}
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
              className="max-h-[85vh] max-w-full object-contain rounded-xl border border-white/20"
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
