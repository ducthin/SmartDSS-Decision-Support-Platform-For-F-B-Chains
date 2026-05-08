import '@/styles/coffee-theme.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Wallet, QrCode, CheckCircle2, ChevronRight, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { orderService } from '@/services/orderService';
import { paymentService } from '@/services/paymentService';
import type { Order, PaymentStatus, TableQrInit, TableSettlementSummary, PaymentFeatureFlags } from '@/types';
import { formatCurrency, getApiErrorMessage } from '@/utils/helpers';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/utils/constants';
import Modal from '@/components/ui/Modal';
import { useOrderSocket } from '@/hooks/useOrderSocket';

type CashConfirmContext = {
  summary: TableSettlementSummary;
  refreshDetailAfter: boolean;
};

export default function TableSettlementPage() {
  const [tableSummaries, setTableSummaries] = useState<TableSettlementSummary[]>([]);
  const [loadingTableSummaries, setLoadingTableSummaries] = useState(false);
  const [refreshingTableSummaries, setRefreshingTableSummaries] = useState(false);
  const [payingTable, setPayingTable] = useState<string | null>(null);
  const [qrTable, setQrTable] = useState<TableSettlementSummary | null>(null);
  const [qrRepresentativeOrderId, setQrRepresentativeOrderId] = useState<number | null>(null);
  const [qrPaymentData, setQrPaymentData] = useState<TableQrInit | null>(null);
  const [qrPaymentStatus, setQrPaymentStatus] = useState<PaymentStatus | null>(null);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [detailTable, setDetailTable] = useState<TableSettlementSummary | null>(null);
  const [detailOrders, setDetailOrders] = useState<Order[]>([]);
  const [loadingDetailOrders, setLoadingDetailOrders] = useState(false);
  const [backendFeatures, setBackendFeatures] = useState<PaymentFeatureFlags | null>(null);
  const [backendFeatureWarning, setBackendFeatureWarning] = useState<string | null>(null);
  const [cashConfirmContext, setCashConfirmContext] = useState<CashConfirmContext | null>(null);
  const lastRealtimeRefreshRef = useRef(0);

  const getErrorStatusCode = (error: unknown): number | null => {
    const maybe = error as { response?: { status?: number } };
    return typeof maybe?.response?.status === 'number' ? maybe.response.status : null;
  };

  const loadLegacyOrderDetails = useCallback(async (summary: TableSettlementSummary) => {
    if (summary.completedUnpaidOrderIds.length === 0) {
      setDetailOrders([]);
      return;
    }
    const responses = await Promise.all(summary.completedUnpaidOrderIds.map((orderId) => orderService.getById(orderId)));
    const orders = responses
      .map((res) => res.data.data)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    setDetailOrders(orders);
  }, []);

  const checkBackendFeatures = useCallback(async () => {
    try {
      const res = await paymentService.getFeatures();
      const data = res.data.data;
      setBackendFeatures(data);
      if (!data.tableSettlementDetail || !data.groupedTableQrSession) {
        setBackendFeatureWarning('Backend chưa bật đầy đủ tính năng thanh toán theo bàn. Một số chức năng sẽ chạy chế độ tương thích.');
      } else {
        setBackendFeatureWarning(null);
      }
    } catch (error) {
      const status = getErrorStatusCode(error);
      if (status === 404) {
        setBackendFeatureWarning('Backend đang chạy phiên bản cũ (thiếu /payments/features). Hệ thống sẽ dùng chế độ tương thích.');
      }
    }
  }, []);

  const loadTableSummaries = useCallback(async (silent = false): Promise<TableSettlementSummary[]> => {
    if (silent) {
      setRefreshingTableSummaries(true);
    } else {
      setLoadingTableSummaries(true);
    }
    try {
      const res = await paymentService.getTableSettlementSummary();
      const next = res.data.data || [];
      setTableSummaries(next);
      return next;
    } catch (error) {
      // Avoid toast spam on background auto-sync
      if (!silent) {
        toast.error(getApiErrorMessage(error, 'Không tải được danh sách bàn đang có order'));
      }
      return [];
    } finally {
      if (silent) {
        setRefreshingTableSummaries(false);
      } else {
        setLoadingTableSummaries(false);
      }
    }
  }, []);

  const payTableByCash = async (summary: TableSettlementSummary) => {
    if (summary.completedUnpaidOrderIds.length === 0) {
      toast('Bàn này chưa có đơn hoàn thành cần thanh toán', { icon: 'ℹ️' });
      return;
    }

    setPayingTable(summary.tableNumber);
    try {
      const res = await paymentService.markTableCashPaid(summary.tableNumber);
      const data = res.data.data;
      toast.success(`Đã thu tiền ${data.settledCount} đơn cho ${data.tableNumber}`);
      await loadTableSummaries(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Thu tiền theo bàn thất bại'));
    } finally {
      setPayingTable(null);
    }
  };

  const openCashConfirm = (summary: TableSettlementSummary, refreshDetailAfter = false) => {
    if (summary.completedUnpaidOrderIds.length === 0) {
      toast('Bàn này chưa có đơn hoàn thành cần thanh toán', { icon: 'ℹ️' });
      return;
    }
    setCashConfirmContext({ summary, refreshDetailAfter });
  };

  const loadTableOrderDetails = useCallback(async (summary: TableSettlementSummary) => {
    try {
      setLoadingDetailOrders(true);
      if (!backendFeatures?.tableSettlementDetail) {
        await loadLegacyOrderDetails(summary);
        return;
      }

      const res = await paymentService.getTableSettlementDetail(summary.tableNumber);
      const detail = res.data.data;
      const nextSummary: TableSettlementSummary = {
        tableNumber: detail.tableNumber,
        pendingCount: detail.pendingCount,
        preparingCount: detail.preparingCount,
        completedUnpaidCount: detail.completedUnpaidCount,
        completedUnpaidTotal: detail.completedUnpaidTotal,
        completedUnpaidOrderIds: detail.completedUnpaidOrderIds,
        latestOrderAt: detail.latestOrderAt,
      };
      setDetailTable(nextSummary);

      const unpaidOrderIdSet = new Set(detail.completedUnpaidOrderIds || []);
      const orders = (detail.orders || [])
        .filter((order) => unpaidOrderIdSet.has(order.id))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
      setDetailOrders(orders);
    } catch (error) {
      const status = getErrorStatusCode(error);
      if (status === 404) {
        setBackendFeatureWarning('Backend chưa hỗ trợ API chi tiết bàn. Đã chuyển sang tải chi tiết theo từng đơn.');
        try {
          await loadLegacyOrderDetails(summary);
          return;
        } catch (legacyError) {
          setDetailOrders([]);
          toast.error(getApiErrorMessage(legacyError, 'Không tải được chi tiết đơn của bàn'));
          return;
        }
      }
      setDetailOrders([]);
      toast.error(getApiErrorMessage(error, 'Không tải được chi tiết đơn của bàn'));
    } finally {
      setLoadingDetailOrders(false);
    }
  }, [backendFeatures, loadLegacyOrderDetails]);

  const openTableDetail = async (summary: TableSettlementSummary) => {
    setDetailTable(summary);
    setDetailOrders([]);
    await loadTableOrderDetails(summary);
  };

  const refreshDetailView = useCallback(async () => {
    if (!detailTable) return;
    await loadTableOrderDetails(detailTable);
  }, [detailTable, loadTableOrderDetails]);

  const quickCashFromDetail = () => {
    if (!detailTable) return;
    openCashConfirm(detailTable, true);
  };

  const confirmCashPayment = async () => {
    if (!cashConfirmContext) return;
    const { summary, refreshDetailAfter } = cashConfirmContext;
    await payTableByCash(summary);
    setCashConfirmContext(null);
    if (refreshDetailAfter) {
      await refreshDetailView();
    }
  };

  const quickQrFromDetail = async () => {
    if (!detailTable) return;
    const target = detailTable;
    setDetailTable(null);
    setDetailOrders([]);
    await openQrPayment(target);
  };

  const printTemporaryBill = () => {
    if (!detailTable) return;

    const printedAt = new Date().toLocaleString('vi-VN');
    const totalItems = detailOrders.reduce((sum, order) => {
      return sum + order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    const orderRows = detailOrders.length === 0
      ? '<tr><td colspan="4" style="padding:8px 0;color:#6b7280">Khong co don de in.</td></tr>'
      : detailOrders.map((order) => {
        const itemNames = order.orderItems
          .map((item) => `${item.quantity}x ${item.menuItemName || `Mon #${item.menuItemId}`}`)
          .join(', ');

        return `<tr>
            <td style="padding:8px 0;border-bottom:1px dashed #e5e7eb">#${order.id}</td>
            <td style="padding:8px 0;border-bottom:1px dashed #e5e7eb">${new Date(order.createdAt).toLocaleTimeString('vi-VN')}</td>
            <td style="padding:8px 0;border-bottom:1px dashed #e5e7eb">${itemNames || '-'}</td>
            <td style="padding:8px 0;border-bottom:1px dashed #e5e7eb;text-align:right">${formatCurrency(order.totalAmount)}</td>
          </tr>`;
      }).join('');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tam tinh ${detailTable.tableNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      .muted { color: #6b7280; font-size: 12px; margin-bottom: 8px; }
      .summary { margin: 8px 0 12px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { text-align: left; padding: 6px 0; border-bottom: 1px solid #d1d5db; }
      th:last-child, td:last-child { text-align: right; }
      .footer { margin-top: 12px; font-size: 13px; font-weight: 700; text-align: right; }
    </style>
  </head>
  <body>
    <h1>Tam tinh - ${detailTable.tableNumber}</h1>
    <div class="muted">In luc: ${printedAt}</div>
    <div class="summary">So don: ${detailOrders.length} | Tong mon: ${totalItems}</div>
    <table>
      <thead>
        <tr>
          <th>Don</th>
          <th>Gio</th>
          <th>Mon</th>
          <th>Tong</th>
        </tr>
      </thead>
      <tbody>${orderRows}</tbody>
    </table>
    <div class="footer">Can thu: ${formatCurrency(detailTable.completedUnpaidTotal)}</div>
  </body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=500,height=760');
    if (!printWindow) {
      toast.error('Trình duyệt đang chặn cửa sổ in');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const initTableQrPayment = async (summary: TableSettlementSummary) => {
    const tableNumber = summary.tableNumber;
    try {
      setRefreshingQr(true);
      const res = await paymentService.initTableQr(tableNumber);
      const data = res.data.data;
      setQrPaymentData(data);
      setQrRepresentativeOrderId(data.representativeOrderId);
      setQrPaymentStatus({
        orderId: data.representativeOrderId,
        status: 'PENDING',
        paymentMethod: 'PENDING',
      });
    } catch (error) {
      const firstOrderId = summary.completedUnpaidOrderIds[0];
      if (!firstOrderId) {
        setQrPaymentData(null);
        setQrRepresentativeOrderId(null);
        toast.error(getApiErrorMessage(error, 'Không khởi tạo được QR thanh toán theo bàn'));
        return;
      }

      // Fallback when table-level QR endpoint is unavailable in current backend runtime.
      try {
        const singleRes = await paymentService.initQr(firstOrderId);
        const single = singleRes.data.data;
        setQrPaymentData({
          tableNumber,
          representativeOrderId: single.orderId,
          includedOrderIds: [single.orderId],
          amount: single.amount,
          transferContent: single.transferContent,
          qrImageUrl: single.qrImageUrl,
          qrCode: single.qrCode,
          checkoutUrl: single.checkoutUrl,
          provider: single.provider,
          expiresAt: single.expiresAt,
        });
        setQrRepresentativeOrderId(single.orderId);
        setQrPaymentStatus(single.paymentStatus);
        if (getErrorStatusCode(error) === 404) {
          setBackendFeatureWarning('Backend chưa hỗ trợ QR gộp theo bàn. Đã chuyển sang QR theo đơn để tiếp tục vận hành.');
        }
        toast('QR gộp chưa sẵn sàng, đã chuyển sang QR theo đơn đầu tiên', { icon: 'ℹ️' });
      } catch (singleError) {
        setQrPaymentData(null);
        setQrRepresentativeOrderId(null);
        toast.error(getApiErrorMessage(singleError, getApiErrorMessage(error, 'Không khởi tạo được QR thanh toán')));
      }
    } finally {
      setRefreshingQr(false);
    }
  };

  const openQrPayment = async (summary: TableSettlementSummary) => {
    if (summary.completedUnpaidOrderIds.length === 0) {
      toast('Bàn này chưa có đơn hoàn thành cần thanh toán', { icon: 'ℹ️' });
      return;
    }
    setQrTable(summary);
    setQrRepresentativeOrderId(null);
    setQrPaymentData(null);
    setQrPaymentStatus(null);
    await initTableQrPayment(summary);
  };

  const refreshQrStatus = useCallback(async (orderId: number, silent = false) => {
    try {
      setRefreshingQr(true);
      const res = await paymentService.getStatus(orderId);
      const status = res.data.data;
      setQrPaymentStatus(status);
      if (status.status === 'PAID') {
        toast.success(`Đơn #${orderId} đã thanh toán thành công`);
        setQrTable(null);
        setQrRepresentativeOrderId(null);
        setQrPaymentData(null);
        await loadTableSummaries(true);
      } else if (!silent) {
        toast('Chưa nhận được thanh toán, vui lòng thử lại sau vài giây', { icon: '⏳' });
      }
      return status;
    } finally {
      setRefreshingQr(false);
    }
  }, [loadTableSummaries]);

  const refreshFromRealtime = useCallback(() => {
    const now = Date.now();
    // Throttle refreshes when many websocket events arrive close together.
    if (now - lastRealtimeRefreshRef.current < 1500) return;
    lastRealtimeRefreshRef.current = now;
    loadTableSummaries(true).catch(() => {
      // no-op
    });
  }, [loadTableSummaries]);

  // Realtime updates: order created/status changed
  useOrderSocket(() => {
    refreshFromRealtime();
  });

  // Realtime updates: payment status changed (topic payload is payment DTO, but we only trigger reload)
  useOrderSocket(() => {
    refreshFromRealtime();
  }, { topicDestination: '/topic/orders-payment' });

  useEffect(() => {
    loadTableSummaries(false);
    checkBackendFeatures().catch(() => {
      // no-op
    });
    // Realtime-only mode: no fallback polling.
  }, [checkBackendFeatures, loadTableSummaries]);

  useEffect(() => {
    if (!qrTable || !qrRepresentativeOrderId) return;
    const timer = window.setInterval(() => {
      refreshQrStatus(qrRepresentativeOrderId, true).catch(() => {
        // Ignore polling transient errors.
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [qrRepresentativeOrderId, qrTable, refreshQrStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thanh toán theo bàn</h1>
          <p className="text-sm text-gray-500 mt-1">Chọn bàn có đơn hoàn thành chưa thanh toán để thu tiền nhanh tại quầy POS.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadTableSummaries(false).catch(() => {
              // no-op
            });
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {refreshingTableSummaries && !loadingTableSummaries && (
        <p className="text-xs text-gray-500">Đang đồng bộ danh sách bàn...</p>
      )}

      {backendFeatureWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {backendFeatureWarning}
        </div>
      )}

      {loadingTableSummaries ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">Đang tải danh sách bàn...</div>
      ) : tableSummaries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">Hiện chưa có bàn nào đang có order cần theo dõi.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tableSummaries.map((summary) => (
            <div
              key={summary.tableNumber}
              className="rounded-xl border border-gray-200 p-4 bg-white cursor-pointer hover:border-blue-300 hover:shadow-sm transition"
              role="button"
              tabIndex={0}
              onClick={() => {
                openTableDetail(summary).catch(() => {
                  // no-op
                });
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openTableDetail(summary).catch(() => {
                    // no-op
                  });
                }
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-gray-800 flex items-center gap-1">
                  {summary.tableNumber}
                  <span className="text-xs text-blue-600 inline-flex items-center gap-0.5 font-medium">
                    Chi tiết <ChevronRight size={14} />
                  </span>
                </p>
                <span className="text-xs text-gray-500">{new Date(summary.latestOrderAt).toLocaleString('vi-VN')}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3 text-xs">
                {summary.pendingCount > 0 && <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Chờ: {summary.pendingCount}</span>}
                {summary.preparingCount > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Đang pha: {summary.preparingCount}</span>}
                {summary.completedUnpaidCount > 0 && <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Chưa thanh toán: {summary.completedUnpaidCount}</span>}
              </div>

              <div className="text-sm text-gray-700 mb-2">
                Cần thu: <span className="font-semibold text-gray-900">{formatCurrency(summary.completedUnpaidTotal)}</span>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                Đơn chưa thanh toán: {summary.completedUnpaidOrderIds.length > 0 ? summary.completedUnpaidOrderIds.join(', ') : 'Không có'}
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openCashConfirm(summary);
                }}
                disabled={summary.completedUnpaidCount === 0 || payingTable === summary.tableNumber}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 mb-2"
              >
                <Wallet size={16} />
                {payingTable === summary.tableNumber ? 'Đang thu tiền...' : 'Tiền mặt'}
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openQrPayment(summary).catch(() => {
                    // no-op
                  });
                }}
                disabled={summary.completedUnpaidCount === 0}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <QrCode size={16} /> QR thanh toán
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!cashConfirmContext}
        onClose={() => {
          setCashConfirmContext(null);
        }}
        title="Xác nhận thu tiền mặt"
        maxWidth="max-w-md"
      >
        {cashConfirmContext && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Bạn có chắc muốn xác nhận đã thu tiền mặt cho <span className="font-semibold">{cashConfirmContext.summary.tableNumber}</span>?
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p>Số đơn sẽ chốt: <span className="font-semibold">{cashConfirmContext.summary.completedUnpaidCount}</span></p>
              <p>Tổng cần thu: <span className="font-semibold">{formatCurrency(cashConfirmContext.summary.completedUnpaidTotal)}</span></p>
            </div>
            <p className="text-xs text-gray-500">Thao tác này sẽ cập nhật trạng thái thanh toán ngay lập tức.</p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCashConfirmContext(null)}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmCashPayment().catch(() => {
                    // no-op
                  });
                }}
                disabled={payingTable === cashConfirmContext.summary.tableNumber}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Wallet size={16} /> {payingTable === cashConfirmContext.summary.tableNumber ? 'Đang xử lý...' : 'Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!detailTable}
        onClose={() => {
          setDetailTable(null);
          setDetailOrders([]);
        }}
        title={detailTable ? `Chi tiết bàn ${detailTable.tableNumber}` : 'Chi tiết bàn'}
        maxWidth="max-w-2xl"
      >
        {detailTable && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-yellow-50 text-yellow-700 px-3 py-2">Chờ xử lý: <span className="font-semibold">{detailTable.pendingCount}</span></div>
              <div className="rounded-lg bg-blue-50 text-blue-700 px-3 py-2">Đang pha: <span className="font-semibold">{detailTable.preparingCount}</span></div>
              <div className="rounded-lg bg-violet-50 text-violet-700 px-3 py-2">Chưa thanh toán: <span className="font-semibold">{detailTable.completedUnpaidCount}</span></div>
              <div className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2">Cần thu: <span className="font-semibold">{formatCurrency(detailTable.completedUnpaidTotal)}</span></div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  refreshDetailView().catch(() => {
                    // no-op
                  });
                }}
                disabled={loadingDetailOrders || refreshingTableSummaries}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                <RefreshCw size={16} /> Làm mới chi tiết
              </button>

              <button
                type="button"
                onClick={() => {
                  quickCashFromDetail();
                }}
                disabled={detailTable.completedUnpaidCount === 0 || payingTable === detailTable.tableNumber}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Wallet size={16} /> {payingTable === detailTable.tableNumber ? 'Đang thu tiền...' : 'Thu tiền mặt nhanh'}
              </button>

              <button
                type="button"
                onClick={() => {
                  quickQrFromDetail().catch(() => {
                    // no-op
                  });
                }}
                disabled={detailTable.completedUnpaidCount === 0}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <QrCode size={16} /> Mở QR thanh toán
              </button>

              <button
                type="button"
                onClick={printTemporaryBill}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
              >
                <Printer size={16} /> In tạm tính
              </button>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Đơn COMPLETED chưa thanh toán</p>
              {loadingDetailOrders ? (
                <div className="text-sm text-gray-500 py-4">Đang tải chi tiết đơn...</div>
              ) : detailOrders.length === 0 ? (
                <div className="text-sm text-gray-500 py-4">Không có đơn chưa thanh toán để hiển thị chi tiết.</div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {detailOrders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-gray-200 p-3 bg-white">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900">Đơn #{order.id}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Giờ tạo: {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                      <p className="text-sm text-gray-700 mt-1">Tổng tiền: <span className="font-semibold">{formatCurrency(order.totalAmount)}</span></p>
                      <p className="text-xs text-gray-600 mt-1">Số món: {order.orderItems.length}</p>
                      {order.note && <p className="text-xs text-gray-600 mt-1">Ghi chú: {order.note}</p>}

                      <div className="mt-2 text-xs text-gray-700">
                        {order.orderItems.map((item) => (
                          <div key={`${order.id}-${item.menuItemId}-${item.selectedSizeCode || 'default'}`} className="flex items-center justify-between py-0.5">
                            <span>{item.quantity}x {item.menuItemName || `Món #${item.menuItemId}`}</span>
                            <span>{formatCurrency(item.subtotal ?? (item.unitPrice || 0) * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!qrTable}
        onClose={() => {
          setQrTable(null);
          setQrRepresentativeOrderId(null);
          setQrPaymentData(null);
          setQrPaymentStatus(null);
        }}
        title={qrTable ? `QR thanh toán - ${qrTable.tableNumber}` : 'QR thanh toán'}
        maxWidth="max-w-lg"
      >
        {qrTable && (
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              Tổng cần thu của bàn: <span className="font-semibold">{formatCurrency(qrPaymentData?.amount ?? qrTable.completedUnpaidTotal)}</span>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Đơn được gộp trong mã QR này</p>
              <div className="text-xs text-gray-700 rounded-lg bg-gray-50 border border-gray-200 p-2">
                {(qrPaymentData?.includedOrderIds ?? qrTable.completedUnpaidOrderIds).length > 0
                  ? (qrPaymentData?.includedOrderIds ?? qrTable.completedUnpaidOrderIds).join(', ')
                  : 'Không có'}
              </div>
              {qrRepresentativeOrderId && (
                <p className="text-xs text-gray-500 mt-1">Đơn đại diện theo dõi trạng thái: #{qrRepresentativeOrderId}</p>
              )}
            </div>

            <div className="py-1">
              <div className="mx-auto w-full max-w-[360px]">
                {qrPaymentData?.qrCode ? (
                  <div className="flex justify-center">
                    <QRCodeSVG
                      value={qrPaymentData.qrCode}
                      size={320}
                      level="M"
                      includeMargin
                      className="h-auto max-w-full"
                    />
                  </div>
                ) : qrPaymentData?.qrImageUrl ? (
                  <img src={qrPaymentData.qrImageUrl} alt={`QR thanh toán đơn ${qrRepresentativeOrderId || ''}`} className="w-full h-auto object-contain" />
                ) : (
                  <div className="h-56 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                    Đang tải mã QR...
                  </div>
                )}
              </div>
              {qrPaymentData?.checkoutUrl && (
                <div className="text-center mt-3">
                  <a
                    href={qrPaymentData.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-medium"
                  >
                    Mở trang thanh toán PayOS
                  </a>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center mt-2">
                Nội dung CK: <span className="font-medium">{qrPaymentData?.transferContent || '---'}</span>
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setQrTable(null);
                  setQrRepresentativeOrderId(null);
                  setQrPaymentData(null);
                  setQrPaymentStatus(null);
                }}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  initTableQrPayment(qrTable).catch(() => {
                    // no-op
                  });
                }}
                disabled={refreshingQr}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-60"
              >
                <RefreshCw size={16} /> Tạo lại QR
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!qrRepresentativeOrderId) return;
                  refreshQrStatus(qrRepresentativeOrderId).catch(() => toast.error('Không thể kiểm tra trạng thái'));
                }}
                disabled={!qrRepresentativeOrderId || refreshingQr}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <CheckCircle2 size={16} /> {refreshingQr ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
              </button>
            </div>

            {qrPaymentStatus?.status === 'PAID' && (
              <p className="text-sm text-emerald-700 font-medium">Đơn đã thanh toán thành công.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
