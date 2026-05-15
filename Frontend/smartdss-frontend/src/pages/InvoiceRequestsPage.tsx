import '@/styles/coffee-theme.css';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, FileText, Printer, RefreshCw, Search, X } from 'lucide-react';
import { invoiceRequestService } from '@/services/invoiceRequestService';
import type { QrInvoiceResponse } from '@/types';

function openBlob(blob: Blob, filename: string, download = false) {
  const url = URL.createObjectURL(blob);
  if (download) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) toast.error('Trình duyệt đang chặn popup');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: 'Chờ xử lý', cls: 'bg-[rgba(201,162,122,0.15)] text-[#7a5c3e] border border-[rgba(201,162,122,0.3)]' },
  READY:     { label: 'Đã xuất',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  SENT:      { label: 'Đã gửi',    cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
};

const DELIVERY_MAP: Record<string, string> = {
  EMAIL: 'Qua Email',
  DIRECT: 'Trực tiếp',
  COUNTER: 'Tại quầy',
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function InvoiceRequestsPage() {
  const [rows, setRows] = useState<QrInvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await invoiceRequestService.getAll(100);
      setRows(res.data.data || []);
    } catch {
      toast.error('Không tải được yêu cầu hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => {
      const searchText = [
        `#${row.requestId}`,
        String(row.requestId),
        `#${row.orderId}`,
        String(row.orderId),
        row.companyName || '',
        row.email || '',
        row.phone || '',
        DELIVERY_MAP[row.deliveryMethod] || row.deliveryMethod || '',
        STATUS_MAP[row.status]?.label || row.status || '',
      ].join(' ').toLowerCase();
      return searchText.includes(keyword);
    });
  }, [rows, search]);

  const handlePdf = async (row: QrInvoiceResponse, download = false) => {
    try {
      const res = await invoiceRequestService.getPdf(row.requestId);
      openBlob(res.data, `hoa-don-don-${row.orderId}.pdf`, download);
    } catch {
      toast.error('Không tải được file PDF hóa đơn');
    }
  };

  const cols = ['Mã YC', 'Thời gian', 'Đơn', 'Công ty', 'Email / SĐT', 'Cách nhận', 'Trạng thái', 'Thao tác'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1a0e07]">
            <FileText size={22} className="text-[#c9a27a]" /> Yêu cầu hóa đơn
          </h1>
          <p className="mt-0.5 text-sm text-[rgba(26,14,7,0.5)]">
            Nhân viên quầy bấm in hóa đơn cho khách lấy tại quầy hoặc xử lý email.
          </p>
        </div>

        {/* Search + Refresh */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-96">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã YC, mã đơn, công ty, email, SĐT"
              className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)] hover:text-[#6b5040]"
                aria-label="Xóa tìm kiếm"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgba(107,80,64,0.18)] px-3.5 py-2.5 text-sm text-[#6b5040] hover:bg-[rgba(107,80,64,0.05)] transition"
          >
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white shadow-[0_2px_12px_-4px_rgba(26,14,7,0.08)]">
        {/* Gradient accent bar */}


        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-[rgba(26,14,7,0.35)]">
            <FileText size={44} className="text-[rgba(107,80,64,0.2)]" />
            <p className="text-sm">Chưa có yêu cầu hóa đơn.</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-14 text-center text-sm text-[rgba(26,14,7,0.4)]">
            Không tìm thấy yêu cầu hóa đơn khớp với từ khóa.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(107,80,64,0.07)] bg-[rgba(253,247,240,0.6)]">
                  {cols.map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)] ${i === cols.length - 1 ? 'text-right pr-5' : 'text-left'} ${i === 0 ? 'pl-5' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(107,80,64,0.05)]">
                {filteredRows.map((row) => (
                  <tr key={row.requestId} className="hover:bg-[rgba(253,247,240,0.5)] transition-colors">
                    <td className="pl-5 px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-[rgba(107,80,64,0.6)]">#{row.requestId}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-xs font-medium text-[rgba(26,14,7,0.7)]">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN', {
                          hour: '2-digit', minute: '2-digit',
                          day: '2-digit', month: '2-digit', year: 'numeric'
                        }) : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-[rgba(107,80,64,0.6)]">#{row.orderId}</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#1a0e07]">{row.companyName || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-[rgba(26,14,7,0.75)]">{row.email || '—'}</div>
                      <div className="text-xs text-[rgba(26,14,7,0.45)]">{row.phone || '—'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[rgba(26,14,7,0.65)]">{DELIVERY_MAP[row.deliveryMethod] || row.deliveryMethod}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePdf(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(201,162,122,0.35)] bg-[rgba(201,162,122,0.08)] px-2.5 py-1.5 text-xs font-medium text-[#7a5c3e] hover:bg-[rgba(201,162,122,0.18)] transition"
                        >
                          <Printer size={13} /> Mở / In
                        </button>
                        <button
                          onClick={() => handlePdf(row, true)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(107,80,64,0.15)] px-2.5 py-1.5 text-xs font-medium text-[rgba(26,14,7,0.6)] hover:bg-[rgba(107,80,64,0.05)] transition"
                        >
                          <Download size={13} /> Tải PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
