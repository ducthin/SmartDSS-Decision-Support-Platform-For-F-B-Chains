import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, FileText, Printer, RefreshCw } from 'lucide-react';
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

export default function InvoiceRequestsPage() {
  const [rows, setRows] = useState<QrInvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    load();
  }, []);

  const handlePdf = async (row: QrInvoiceResponse, download = false) => {
    try {
      const res = await invoiceRequestService.getPdf(row.requestId);
      openBlob(res.data, `hoa-don-don-${row.orderId}.pdf`, download);
    } catch {
      toast.error('Không tải được file PDF hóa đơn');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FileText size={24} /> Yêu cầu hóa đơn
          </h1>
          <p className="mt-1 text-sm text-gray-500">Nhân viên quầy bấm in hóa đơn cho khách lấy tại quầy hoặc xử lý email.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Chưa có yêu cầu hóa đơn.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Mã YC</th>
                  <th className="px-3 py-2 text-left">Đơn</th>
                  <th className="px-3 py-2 text-left">Công ty</th>
                  <th className="px-3 py-2 text-left">Email/SĐT</th>
                  <th className="px-3 py-2 text-left">Cách nhận</th>
                  <th className="px-3 py-2 text-left">Trạng thái</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.requestId} className="border-t border-gray-100">
                    <td className="px-3 py-2">#{row.requestId}</td>
                    <td className="px-3 py-2">#{row.orderId}</td>
                    <td className="px-3 py-2">{row.companyName || '—'}</td>
                    <td className="px-3 py-2">
                      <div>{row.email || '—'}</div>
                      <div className="text-xs text-gray-500">{row.phone || '—'}</div>
                    </td>
                    <td className="px-3 py-2">{row.deliveryMethod}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handlePdf(row)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-300 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        <Printer size={14} /> Mở PDF / In
                      </button>
                      <button
                        onClick={() => handlePdf(row, true)}
                        className="ml-2 inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Download size={14} /> Tải PDF
                      </button>
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
