import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Plus, Search, Trash2, PenSquare, Wallet } from 'lucide-react';
import type {
  CashClosing,
  FinanceCategory,
  FinanceSummary,
  FinanceTransaction,
  FinanceTransactionForm,
  FinanceType,
  GrossProfitPoint,
  PageResponse,
} from '@/types';
import { financeService } from '@/services/financeService';
import { formatCurrency, getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';

function toInputDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toInputDateTime(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

const EMPTY_SUMMARY: FinanceSummary = {
  fromDate: '',
  toDate: '',
  totalIncome: 0,
  totalExpense: 0,
  netCashflow: 0,
  totalTransactions: 0,
};

export default function FinancePage() {
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return toInputDate(d);
  }, [today]);
  const defaultTo = useMemo(() => toInputDate(today), [today]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<FinanceTransaction> | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>(EMPTY_SUMMARY);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [grossProfitDaily, setGrossProfitDaily] = useState<GrossProfitPoint[]>([]);
  const [grossProfitMonthly, setGrossProfitMonthly] = useState<GrossProfitPoint[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);
  const [cashClosingPageData, setCashClosingPageData] = useState<PageResponse<CashClosing> | null>(null);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [typeFilter, setTypeFilter] = useState<FinanceType | ''>('');
  const [keyword, setKeyword] = useState('');
  const [previewingClosing, setPreviewingClosing] = useState(false);
  const [closingSaving, setClosingSaving] = useState(false);
  const [closingPreview, setClosingPreview] = useState<CashClosing | null>(null);
  const [closingForm, setClosingForm] = useState({
    businessDate: defaultTo,
    openingBalance: '',
    actualBalance: '',
    note: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'EXPENSE' as FinanceType });
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [form, setForm] = useState<FinanceTransactionForm>({
    categoryId: 0,
    amount: 0,
    occurredAt: toInputDateTime(new Date()),
    note: '',
    sourceType: '',
    sourceRefId: '',
  });

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      financeService.getCategories(true),
      financeService.getTransactions({
        page,
        size: 20,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        type: typeFilter || undefined,
        keyword: keyword.trim() || undefined,
      }),
      financeService.getSummary(fromDate || undefined, toDate || undefined),
      financeService.getGrossProfitDaily(fromDate || undefined, toDate || undefined),
      financeService.getGrossProfitMonthly(fromDate || undefined, toDate || undefined),
      financeService.getCashClosings({
        page: 0,
        size: 10,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    ])
      .then(([categoryRes, txRes, summaryRes, grossDailyRes, grossMonthlyRes, cashClosingsRes]) => {
        const catData = categoryRes.data.data || [];
        const txData = txRes.data.data;
        const cashClosingData = cashClosingsRes.data.data;
        setCategories(catData);
        setPageData(txData);
        setTransactions(txData?.content || []);
        setSummary(summaryRes.data.data || EMPTY_SUMMARY);
        setGrossProfitDaily(grossDailyRes.data.data || []);
        setGrossProfitMonthly(grossMonthlyRes.data.data || []);
        setCashClosingPageData(cashClosingData || null);
        setCashClosings(cashClosingData?.content || []);

        if (catData.length > 0 && !form.categoryId) {
          setForm((prev) => ({ ...prev, categoryId: catData[0].id }));
        }
      })
      .catch((error) => {
        toast.error(getApiErrorMessage(error, 'Không thể tải dữ liệu tài chính'));
      })
      .finally(() => setLoading(false));
  }, [form.categoryId, fromDate, keyword, page, toDate, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    const firstCategory = categories[0];
    setEditingTransaction(null);
    setForm({
      categoryId: firstCategory ? firstCategory.id : 0,
      amount: 0,
      occurredAt: toInputDateTime(new Date()),
      note: '',
      sourceType: '',
      sourceRefId: '',
    });
    setShowModal(true);
  };

  const openEditModal = (tx: FinanceTransaction) => {
    setEditingTransaction(tx);
    setForm({
      categoryId: tx.categoryId,
      amount: Number(tx.amount),
      occurredAt: tx.occurredAt ? tx.occurredAt.slice(0, 16) : toInputDateTime(new Date()),
      note: tx.note || '',
      sourceType: tx.sourceType || '',
      sourceRefId: tx.sourceRefId || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.categoryId) {
      toast.error('Vui lòng chọn danh mục');
      return;
    }
    if (form.amount <= 0) {
      toast.error('Số tiền phải > 0');
      return;
    }

    setSaving(true);
    try {
      const payload: FinanceTransactionForm = {
        categoryId: form.categoryId,
        amount: Number(form.amount),
        occurredAt: form.occurredAt || undefined,
        note: form.note?.trim() || undefined,
        sourceType: form.sourceType?.trim() || undefined,
        sourceRefId: form.sourceRefId?.trim() || undefined,
      };

      if (editingTransaction) {
        await financeService.updateTransaction(editingTransaction.id, payload);
        toast.success('Đã cập nhật giao dịch');
      } else {
        await financeService.createTransaction(payload);
        toast.success('Đã ghi nhận giao dịch');
      }
      setShowModal(false);
      setPage(0);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu giao dịch'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Tên danh mục không được để trống');
      return;
    }

    setCategorySaving(true);
    try {
      await financeService.createCategory({
        name: categoryForm.name.trim(),
        type: categoryForm.type,
        active: true,
      });
      toast.success('Đã tạo danh mục thu/chi');
      setShowCategoryModal(false);
      setCategoryForm({ name: '', type: 'EXPENSE' });
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tạo danh mục'));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDelete = async (tx: FinanceTransaction) => {
    const ok = window.confirm(`Xóa giao dịch ${tx.categoryName} (${formatCurrency(tx.amount)})?`);
    if (!ok) return;
    try {
      await financeService.deleteTransaction(tx.id);
      toast.success('Đã xóa giao dịch');
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xóa giao dịch'));
    }
  };

  const parseOptionalNumber = (raw: string) => {
    if (!raw.trim()) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const handlePreviewClosing = async () => {
    const openingBalance = parseOptionalNumber(closingForm.openingBalance);
    if (openingBalance != null && openingBalance < 0) {
      toast.error('Tồn đầu phải >= 0');
      return;
    }

    setPreviewingClosing(true);
    try {
      const res = await financeService.previewCashClosing(closingForm.businessDate || undefined, openingBalance);
      setClosingPreview(res.data.data || null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xem trước kỳ chốt quỹ'));
    } finally {
      setPreviewingClosing(false);
    }
  };

  const handleCloseCashDay = async () => {
    const actualBalance = parseOptionalNumber(closingForm.actualBalance);
    const openingBalance = parseOptionalNumber(closingForm.openingBalance);

    if (actualBalance == null || actualBalance < 0) {
      toast.error('Tồn thực tế phải >= 0');
      return;
    }
    if (openingBalance != null && openingBalance < 0) {
      toast.error('Tồn đầu phải >= 0');
      return;
    }

    const businessDate = closingForm.businessDate || defaultTo;
    const expectedBalance = closingPreview?.expectedBalance;
    const variance = expectedBalance == null ? null : actualBalance - expectedBalance;
    const confirmMessage = [
      `Xác nhận chốt quỹ ngày ${businessDate}?`,
      `- Tồn thực tế: ${formatCurrency(actualBalance)}`,
      expectedBalance == null ? '- Tồn kỳ vọng: chưa tính trước (hệ thống sẽ tự tính khi chốt)' : `- Tồn kỳ vọng: ${formatCurrency(expectedBalance)}`,
      variance == null ? null : `- Chênh lệch dự kiến: ${formatCurrency(variance)}`,
    ]
      .filter(Boolean)
      .join('\n');

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    setClosingSaving(true);
    try {
      const res = await financeService.closeCashDay({
        businessDate: closingForm.businessDate || undefined,
        openingBalance,
        actualBalance,
        note: closingForm.note.trim() || undefined,
      });
      setClosingPreview(res.data.data || null);
      toast.success('Đã chốt quỹ cuối ngày');
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể chốt quỹ'));
    } finally {
      setClosingSaving(false);
    }
  };

  const grossTotalRevenue = grossProfitDaily.reduce((sum, row) => sum + (row.revenue || 0), 0);
  const grossTotalCogs = grossProfitDaily.reduce((sum, row) => sum + (row.cogs || 0), 0);
  const grossTotalProfit = grossProfitDaily.reduce((sum, row) => sum + (row.grossProfit || 0), 0);
  const grossProfitDailyDisplay = useMemo(
    () => [...grossProfitDaily].sort((a, b) => b.period.localeCompare(a.period)),
    [grossProfitDaily],
  );
  const grossProfitMonthlyDisplay = useMemo(
    () => [...grossProfitMonthly].sort((a, b) => b.period.localeCompare(a.period)),
    [grossProfitMonthly],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tài chính</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-700">Tổng thu</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(summary.totalIncome || 0)}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">Tổng chi</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(summary.totalExpense || 0)}</p>
        </div>
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">Dòng tiền ròng</p>
          <p className={`text-2xl font-bold mt-1 ${(summary.netCashflow || 0) >= 0 ? 'text-blue-800' : 'text-red-700'}`}>
            {formatCurrency(summary.netCashflow || 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Báo cáo lãi gộp (Revenue - COGS)</h2>
          <p className="text-sm text-gray-500">Theo khoảng ngày lọc hiện tại</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Tổng Revenue</p>
            <p className="text-lg font-semibold text-emerald-800">{formatCurrency(grossTotalRevenue)}</p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <p className="text-xs text-orange-700">Tổng COGS</p>
            <p className="text-lg font-semibold text-orange-800">{formatCurrency(grossTotalCogs)}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-700">Tổng lãi gộp</p>
            <p className={`text-lg font-semibold ${grossTotalProfit >= 0 ? 'text-blue-800' : 'text-red-700'}`}>
              {formatCurrency(grossTotalProfit)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 font-medium text-sm">Theo ngày</div>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Ngày</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Revenue</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">COGS</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Lãi gộp</th>
                  </tr>
                </thead>
                <tbody>
                  {grossProfitDailyDisplay.map((row) => (
                    <tr key={row.period} className="border-t border-gray-100">
                      <td className="py-2 px-3">{row.period}</td>
                      <td className="py-2 px-3">{formatCurrency(row.revenue || 0)}</td>
                      <td className="py-2 px-3">{formatCurrency(row.cogs || 0)}</td>
                      <td className={`py-2 px-3 font-medium ${(row.grossProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(row.grossProfit || 0)}
                      </td>
                    </tr>
                  ))}
                  {grossProfitDailyDisplay.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400">Chưa có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 font-medium text-sm">Theo tháng</div>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Tháng</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Revenue</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">COGS</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Lãi gộp</th>
                  </tr>
                </thead>
                <tbody>
                  {grossProfitMonthlyDisplay.map((row) => (
                    <tr key={row.period} className="border-t border-gray-100">
                      <td className="py-2 px-3">{row.period}</td>
                      <td className="py-2 px-3">{formatCurrency(row.revenue || 0)}</td>
                      <td className="py-2 px-3">{formatCurrency(row.cogs || 0)}</td>
                      <td className={`py-2 px-3 font-medium ${(row.grossProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(row.grossProfit || 0)}
                      </td>
                    </tr>
                  ))}
                  {grossProfitMonthlyDisplay.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400">Chưa có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chốt quỹ cuối ngày</h2>
          <p className="text-sm text-gray-500">Tổng kỳ chốt: {cashClosingPageData?.totalElements ?? cashClosings.length}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ngày chốt</label>
            <input
              type="date"
              value={closingForm.businessDate}
              onChange={(e) => setClosingForm((prev) => ({ ...prev, businessDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tồn đầu (tùy chọn)</label>
            <input
              type="number"
              min={0}
              value={closingForm.openingBalance}
              onChange={(e) => setClosingForm((prev) => ({ ...prev, openingBalance: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Để trống = lấy tồn cuối kỳ trước"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tồn thực tế</label>
            <input
              type="number"
              min={0}
              value={closingForm.actualBalance}
              onChange={(e) => setClosingForm((prev) => ({ ...prev, actualBalance: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Số tiền kiểm kê thực tế"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
            <input
              value={closingForm.note}
              onChange={(e) => setClosingForm((prev) => ({ ...prev, note: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ghi chú chốt quỹ"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePreviewClosing}
            disabled={previewingClosing}
            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {previewingClosing ? 'Đang tính...' : 'Tính tồn kỳ vọng'}
          </button>
          <button
            onClick={handleCloseCashDay}
            disabled={closingSaving}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Wallet size={16} /> {closingSaving ? 'Đang chốt...' : 'Chốt quỹ'}
          </button>
        </div>

        {closingPreview && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Tồn đầu</p>
              <p className="font-semibold">{formatCurrency(closingPreview.openingBalance || 0)}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Tổng thu</p>
              <p className="font-semibold text-emerald-700">{formatCurrency(closingPreview.totalInflow || 0)}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-700">Tổng chi</p>
              <p className="font-semibold text-red-700">{formatCurrency(closingPreview.totalOutflow || 0)}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Tồn kỳ vọng</p>
              <p className="font-semibold text-blue-700">{formatCurrency(closingPreview.expectedBalance || 0)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Chênh lệch</p>
              <p className={`font-semibold ${(closingPreview.variance || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(closingPreview.variance || 0)}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Ngày</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Tồn đầu</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Tổng thu</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Tổng chi</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Tồn kỳ vọng</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Tồn thực tế</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Chênh lệch</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Người chốt</th>
              </tr>
            </thead>
            <tbody>
              {cashClosings.map((row) => (
                <tr key={row.id ?? row.businessDate} className="border-t border-gray-100">
                  <td className="py-2 px-3">{row.businessDate}</td>
                  <td className="py-2 px-3">{formatCurrency(row.openingBalance || 0)}</td>
                  <td className="py-2 px-3">{formatCurrency(row.totalInflow || 0)}</td>
                  <td className="py-2 px-3">{formatCurrency(row.totalOutflow || 0)}</td>
                  <td className="py-2 px-3">{formatCurrency(row.expectedBalance || 0)}</td>
                  <td className="py-2 px-3">{formatCurrency(row.actualBalance || 0)}</td>
                  <td className={`py-2 px-3 font-medium ${(row.variance || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(row.variance || 0)}
                  </td>
                  <td className="py-2 px-3">{row.closedByName || '-'}</td>
                </tr>
              ))}
              {cashClosings.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400">Chưa có kỳ chốt quỹ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-400 text-sm">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter((e.target.value as FinanceType) || '');
              setPage(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tất cả loại</option>
            <option value="INCOME">Thu</option>
            <option value="EXPENSE">Chi</option>
          </select>

          <div className="relative flex-1 min-w-50">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo ghi chú hoặc danh mục..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            <Plus size={16} /> Ghi nhận thu/chi
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
          >
            <Plus size={16} /> Danh mục
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Thời gian</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Loại</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Danh mục</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Số tiền</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Ghi chú</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Người tạo</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-gray-100">
                    <td className="py-3 px-3 text-gray-600">{new Date(tx.occurredAt).toLocaleString('vi-VN')}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.type === 'INCOME' ? 'Thu' : 'Chi'}
                      </span>
                    </td>
                    <td className="py-3 px-3">{tx.categoryName}</td>
                    <td className={`py-3 px-3 font-semibold ${tx.type === 'INCOME' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3 px-3 text-gray-600">{tx.note || '-'}</td>
                    <td className="py-3 px-3 text-gray-600">{tx.createdByName || '-'}</td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                      >
                        <PenSquare size={14} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(tx)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">Chưa có giao dịch trong khoảng thời gian đã chọn</td>
                  </tr>
                )}
              </tbody>
            </table>
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

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingTransaction ? 'Cập nhật giao dịch thu/chi' : 'Ghi nhận giao dịch thu/chi'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục <span className="text-red-500">*</span></label>
            <select
              value={form.categoryId || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.type === 'INCOME' ? 'Thu' : 'Chi'} - {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={form.amount || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian phát sinh</label>
              <input
                type="datetime-local"
                value={form.occurredAt || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, occurredAt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn</label>
              <input
                value={form.sourceType || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, sourceType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Ví dụ: MANUAL, SALES, INVENTORY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã tham chiếu</label>
              <input
                value={form.sourceRefId || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, sourceRefId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Ví dụ: ORDER-123"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea
              value={form.note || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-24"
              placeholder="Nội dung thu/chi"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Wallet size={16} /> {saving ? 'Đang lưu...' : 'Lưu giao dịch'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Thêm danh mục thu/chi"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục <span className="text-red-500">*</span></label>
            <input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ví dụ: Thu tiền mặt, Tiền điện"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại danh mục</label>
            <select
              value={categoryForm.type}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, type: e.target.value as FinanceType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="INCOME">Thu</option>
              <option value="EXPENSE">Chi</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleCreateCategory}
              disabled={categorySaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {categorySaving ? 'Đang lưu...' : 'Tạo danh mục'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
