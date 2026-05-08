import '@/styles/coffee-theme.css';
import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/ui/Pagination';
import { bookingService } from '@/services/bookingService';
import { getApiErrorMessage } from '@/utils/helpers';
import type { BookingStatus, PageResponse, TableBooking } from '@/types';

const STATUS_LABELS: Record<BookingStatus, string> = {
  NEW: 'Mới',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  NEW:       'bg-blue-50 text-blue-700 border border-blue-200',
  CONFIRMED: 'bg-[rgba(201,162,122,0.15)] text-[#7a5c3e] border border-[rgba(201,162,122,0.35)]',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-600 border border-rose-200',
};

const STATUS_BTN_ACTIVE: Record<BookingStatus, string> = {
  NEW:       'border-blue-300 bg-blue-50 text-blue-700',
  CONFIRMED: 'border-[#c9a27a] bg-[rgba(201,162,122,0.12)] text-[#7a5c3e]',
  COMPLETED: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  CANCELLED: 'border-rose-300 bg-rose-50 text-rose-600',
};

const inputCls =
  'px-3 py-2 border border-[rgba(107,80,64,0.2)] rounded-lg text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)] bg-white';

export default function BookingsPage() {
  const [items, setItems] = useState<TableBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<TableBooking> | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingService.getAll(page, 10, {
        keyword: keyword || undefined,
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      const data = res.data.data;
      setItems(data.content || []);
      setPageData(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải danh sách đặt bàn'));
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: number, status: BookingStatus) => {
    setSavingId(id);
    try {
      const res = await bookingService.updateStatus(id, status);
      const updated = res.data.data;
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Cập nhật trạng thái thành công');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái đặt bàn'));
    } finally {
      setSavingId(null);
    }
  };

  const clearFilters = () => {
    setKeyword('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const hasFilters = keyword || statusFilter || fromDate || toDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0e07]">Đặt bàn</h1>
          <p className="mt-0.5 text-sm text-[rgba(26,14,7,0.5)]">Quản lý yêu cầu đặt bàn của khách hàng</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[rgba(26,14,7,0.45)]">
          <CalendarCheck2 size={16} className="text-[#c9a27a]" />
          {pageData ? `${pageData.totalElements} yêu cầu` : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[rgba(107,80,64,0.1)] rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className={`w-full pl-9 pr-8 ${inputCls}`}
            />
            {keyword && (
              <button onClick={() => setKeyword('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)] hover:text-[#6b5040]">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as BookingStatus | '') || '')}
            className={inputCls}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="NEW">Mới</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          {/* Date range */}
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => { setPage(0); load(); }}
            className="px-4 py-2 rounded-lg bg-[#6b5040] text-white text-sm font-medium shadow-sm hover:brightness-110 transition active:scale-95"
          >
            Áp dụng lọc
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg border border-[rgba(107,80,64,0.18)] text-sm text-[#6b5040] hover:bg-[rgba(107,80,64,0.05)] transition"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-[rgba(26,14,7,0.35)]">
          <CalendarCheck2 size={44} className="text-[rgba(107,80,64,0.2)]" />
          <p className="text-sm">Chưa có yêu cầu đặt bàn nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[rgba(107,80,64,0.1)] p-4 shadow-[0_2px_8px_-4px_rgba(26,14,7,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(26,14,7,0.1)] transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#1a0e07]">{item.customerName}</div>
                  <div className="text-xs text-[rgba(26,14,7,0.5)] mt-0.5">
                    {item.customerPhone} · {item.guestCount} khách
                  </div>
                  <div className="text-xs text-[rgba(26,14,7,0.35)] mt-1">
                    {item.bookingDate} {String(item.bookingTime).slice(0, 5)}
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>

              {item.note && (
                <p className="mt-3 text-sm text-[rgba(26,14,7,0.65)] bg-[rgba(253,247,240,0.8)] rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {item.note}
                </p>
              )}

              {/* Status action buttons */}
              <div className="mt-3 pt-3 border-t border-[rgba(107,80,64,0.07)] flex flex-wrap gap-2">
                {(['NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as BookingStatus[]).map((status) => (
                  <button
                    key={status}
                    disabled={savingId === item.id || item.status === status}
                    onClick={() => updateStatus(item.id, status)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
                      item.status === status
                        ? STATUS_BTN_ACTIVE[status]
                        : 'border-[rgba(107,80,64,0.15)] text-[rgba(26,14,7,0.55)] hover:bg-[rgba(107,80,64,0.05)] hover:border-[rgba(107,80,64,0.3)]'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
