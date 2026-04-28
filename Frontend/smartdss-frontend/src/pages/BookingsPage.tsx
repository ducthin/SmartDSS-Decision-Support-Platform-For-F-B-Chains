import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck2, Search } from 'lucide-react';
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
  NEW: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

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

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Đặt bàn</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter((e.target.value as BookingStatus | '') || '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="NEW">Mới</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="COMPLETED">Hoàn tất</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
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
        <button
          onClick={() => {
            setPage(0);
            load();
          }}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Lọc
        </button>
        <button
          onClick={clearFilters}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
        >
          Xóa lọc
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CalendarCheck2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>Chưa có yêu cầu đặt bàn nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{item.customerName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.customerPhone} - {item.guestCount} khách
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {item.bookingDate} {String(item.bookingTime).slice(0, 5)}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              {item.note ? (
                <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{item.note}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {(['NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as BookingStatus[]).map((status) => (
                  <button
                    key={status}
                    disabled={savingId === item.id || item.status === status}
                    onClick={() => updateStatus(item.id, status)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                      item.status === status
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    } disabled:opacity-60`}
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
