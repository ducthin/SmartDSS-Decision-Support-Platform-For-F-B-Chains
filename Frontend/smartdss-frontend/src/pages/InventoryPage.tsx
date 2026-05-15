import '@/styles/coffee-theme.css';
import { useEffect, useState, useCallback } from 'react';
import { inventoryService } from '@/services/inventoryService';
import type { Inventory, InventoryItemForm, InventoryTransactionForm, InventoryTransactionHistory, PageResponse } from '@/types';
import { Plus, Minus, AlertTriangle, Search, PenSquare, History, Package } from 'lucide-react';

import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function InventoryPage() {
  const emptyItemForm: InventoryItemForm = { ingredientName: '', unit: '', quantity: '', minimumStock: '' };
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'deduct'>('add');
  const [form, setForm] = useState<InventoryTransactionForm>({ inventoryId: 0, quantity: '', reason: '' });
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemMode, setItemMode] = useState<'create' | 'edit'>('create');
  const [itemForm, setItemForm] = useState<InventoryItemForm>(emptyItemForm);
  const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemSaving, setItemSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<Inventory> | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<PageResponse<InventoryTransactionHistory> | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [showMarketPriceModal, setShowMarketPriceModal] = useState(false);
  const [marketPriceSaving, setMarketPriceSaving] = useState(false);
  const [marketPriceForm, setMarketPriceForm] = useState({
    inventoryId: 0,
    ingredientName: '',
    unitCost: '',
    marketUnitPrice: '',
    source: '',
  });
  const [keyword, setKeyword] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState<boolean | undefined>(undefined);
  const debouncedKeyword = useDebounce(keyword);

  const load = useCallback(() => {
    setLoading(true);
    const hasFilter = debouncedKeyword || lowStockFilter !== undefined;
    const promise = hasFilter
      ? inventoryService.getAll(page, 10, debouncedKeyword || undefined, lowStockFilter)
      : inventoryService.getAll(page);
    promise
      .then((res) => {
        const data = res.data.data;
        setInventory(data.content);
        setPageData(data);
      })
      .catch(() => toast.error('Lỗi tải kho'))
      .finally(() => setLoading(false));
  }, [page, debouncedKeyword, lowStockFilter]);

  useEffect(load, [load]);

  const openModal = (type: 'add' | 'deduct', inv: Inventory) => {
    setModalType(type);
    setForm({ inventoryId: inv.id, quantity: '', reason: '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (form.quantity === '' || Number(form.quantity) <= 0) return toast.error('Số lượng phải > 0');
    setSaving(true);
    try {
      if (modalType === 'add') {
        await inventoryService.addStock(form);
        toast.success('Nhập kho thành công');
      } else {
        await inventoryService.deductStock(form);
        toast.success('Xuất kho thành công');
      }
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi cập nhật kho'));
    } finally {
      setSaving(false);
    }
  };

  const openCreateItemModal = () => {
    setItemMode('create');
    setEditingInventoryId(null);
    setItemForm(emptyItemForm);
    setShowItemModal(true);
  };

  const openEditItemModal = (inv: Inventory) => {
    setItemMode('edit');
    setEditingInventoryId(inv.id);
    setItemForm({
      ingredientName: inv.ingredientName,
      unit: inv.unit,
      quantity: Number(inv.quantity),
      minimumStock: Number(inv.minimumStock),
    });
    setShowItemModal(true);
  };

  const handleItemSubmit = async () => {
    if (!itemForm.ingredientName.trim()) return toast.error('Tên nguyên liệu không được để trống');
    if (!itemForm.unit.trim()) return toast.error('Đơn vị không được để trống');
    if (itemForm.quantity === '' || Number(itemForm.quantity) < 0) return toast.error('Tồn kho phải >= 0');
    if (itemForm.minimumStock === '' || Number(itemForm.minimumStock) < 0) return toast.error('Mức tối thiểu phải >= 0');

    setItemSaving(true);
    try {
      if (itemMode === 'create') {
        await inventoryService.createItem(itemForm);
        toast.success('Thêm nguyên liệu thành công');
      } else if (editingInventoryId) {
        await inventoryService.updateItem(editingInventoryId, itemForm);
        toast.success('Cập nhật nguyên liệu thành công');
      }
      setShowItemModal(false);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu nguyên liệu'));
    } finally {
      setItemSaving(false);
    }
  };

  const openHistoryModal = (inv: Inventory) => {
    setSelectedInventory(inv);
    setHistoryPage(0);
    setShowHistoryModal(true);
  };

  const openMarketPriceModal = (inv: Inventory) => {
    setMarketPriceForm({
      inventoryId: inv.id,
      ingredientName: inv.ingredientName,
      unitCost: inv.unitCost != null ? String(inv.unitCost) : '',
      marketUnitPrice: inv.marketUnitPrice != null ? String(inv.marketUnitPrice) : '',
      source: inv.marketPriceSource || '',
    });
    setShowMarketPriceModal(true);
  };

  const handleMarketPriceSubmit = async () => {
    if (!marketPriceForm.inventoryId) return;
    if (marketPriceForm.unitCost === '' || Number(marketPriceForm.unitCost) < 0) {
      toast.error('Giá vốn nội bộ phải >= 0');
      return;
    }
    if (marketPriceForm.marketUnitPrice === '' || Number(marketPriceForm.marketUnitPrice) < 0) {
      toast.error('Giá thị trường phải >= 0');
      return;
    }

    setMarketPriceSaving(true);
    try {
      await Promise.all([
        inventoryService.updateUnitCost(marketPriceForm.inventoryId, {
          unitCost: Number(marketPriceForm.unitCost),
        }),
        inventoryService.updateMarketPrice(marketPriceForm.inventoryId, {
          marketUnitPrice: Number(marketPriceForm.marketUnitPrice),
          source: marketPriceForm.source.trim() || undefined,
        }),
      ]);
      toast.success('Đã cập nhật giá vốn và giá thị trường');
      setShowMarketPriceModal(false);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật giá nguyên liệu'));
    } finally {
      setMarketPriceSaving(false);
    }
  };

  const loadHistory = useCallback(() => {
    if (!showHistoryModal || !selectedInventory) return;
    setHistoryLoading(true);
    inventoryService.getTransactions(selectedInventory.id, historyPage, 10)
      .then((res) => setHistoryData(res.data.data))
      .catch(() => toast.error('Không thể tải lịch sử nhập xuất'))
      .finally(() => setHistoryLoading(false));
  }, [showHistoryModal, selectedInventory, historyPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const inputCls = 'w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.15)] bg-white';
  const labelCls = 'block text-sm font-semibold text-[#1a0e07] mb-1.5';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0e07]">Quản lý kho</h1>
          <p className="mt-0.5 text-sm text-[rgba(26,14,7,0.5)]">Theo dõi tồn kho và lịch sử nhập xuất nguyên liệu</p>
        </div>
        <button
          onClick={openCreateItemModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b5040] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition active:scale-95"
        >
          <Plus size={16} /> Thêm nguyên liệu
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)]" />
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
            placeholder="Tìm kiếm nguyên liệu..."
            className="w-full pl-10 pr-3 py-2.5 border border-[rgba(107,80,64,0.18)] rounded-xl text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)] bg-white"
          />
        </div>
        <label className="flex items-center gap-2 px-3 py-2.5 border border-[rgba(107,80,64,0.18)] rounded-xl cursor-pointer hover:bg-[rgba(107,80,64,0.04)] text-sm text-[rgba(26,14,7,0.7)] transition">
          <input
            type="checkbox"
            checked={lowStockFilter === true}
            onChange={(e) => { setLowStockFilter(e.target.checked ? true : undefined); setPage(0); }}
            className="rounded accent-[#6b5040]"
          />
          <AlertTriangle size={15} className="text-amber-500" />
          Chỉ hiện sắp hết
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.1)] bg-white shadow-[0_2px_12px_-4px_rgba(26,14,7,0.07)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(107,80,64,0.07)] bg-[rgba(253,247,240,0.6)]">
                  {['Nguyên liệu', 'Tồn kho', 'Đơn vị', 'Mức tối thiểu', 'Trạng thái', 'Thao tác'].map((h, i) => (
                    <th key={h} className={`py-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)] ${i === 5 ? 'text-right pr-5' : 'text-left'} ${i === 0 ? 'pl-5' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(107,80,64,0.05)]">
                {inventory.map((inv) => {
                  const isLow = inv.quantity <= inv.minimumStock;
                  return (
                    <tr key={inv.id} className={`transition-colors ${isLow ? 'bg-rose-50/60' : 'hover:bg-[rgba(253,247,240,0.5)]'}`}>
                      <td className="pl-5 px-4 py-3.5 font-medium text-[#1a0e07]">{inv.ingredientName}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#1a0e07]">{inv.quantity}</td>
                      <td className="px-4 py-3.5 text-[rgba(26,14,7,0.5)]">{inv.unit}</td>
                      <td className="px-4 py-3.5 text-[rgba(26,14,7,0.5)]">{inv.minimumStock}</td>
                      <td className="px-4 py-3.5">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                            <AlertTriangle size={11} /> Sắp hết
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Đủ hàng</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openHistoryModal(inv)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(107,80,64,0.08)] text-[rgba(107,80,64,0.7)] rounded-lg text-xs hover:bg-[rgba(107,80,64,0.14)] transition">
                            <History size={13} /> Lịch sử
                          </button>
                          <button onClick={() => openEditItemModal(inv)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(201,162,122,0.12)] text-[#7a5c3e] rounded-lg text-xs hover:bg-[rgba(201,162,122,0.22)] transition">
                            <PenSquare size={13} /> Sửa
                          </button>
                          <button onClick={() => openMarketPriceModal(inv)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(107,80,64,0.06)] text-[rgba(107,80,64,0.65)] rounded-lg text-xs hover:bg-[rgba(107,80,64,0.12)] transition">
                            Giá
                          </button>
                          <button onClick={() => openModal('add', inv)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 border border-emerald-200 transition">
                            <Plus size={13} /> Nhập
                          </button>
                          <button onClick={() => openModal('deduct', inv)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs hover:bg-amber-100 border border-amber-200 transition">
                            <Minus size={13} /> Xuất
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-[rgba(26,14,7,0.35)]">
                        <Package size={36} className="text-[rgba(107,80,64,0.2)]" />
                        <span className="text-sm">Chưa có nguyên liệu</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pageData && (
            <div className="border-t border-[rgba(107,80,64,0.07)] px-5 py-3">
              <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Nhập / Xuất kho modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={modalType === 'add' ? 'Nhập kho' : 'Xuất kho'}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Số lượng <span className="text-rose-500">*</span></label>
            <input type="number" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
              className={inputCls} min={1} />
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputCls} />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowModal(false)}
              className="rounded-xl border border-[rgba(107,80,64,0.18)] px-4 py-2.5 text-sm font-medium text-[#6b5040] hover:bg-[rgba(107,80,64,0.05)] transition">
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50 active:scale-95 transition ${modalType === 'add' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
              {saving ? 'Đang xử lý...' : modalType === 'add' ? 'Nhập kho' : 'Xuất kho'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Thêm / Sửa nguyên liệu modal */}
      <Modal open={showItemModal} onClose={() => setShowItemModal(false)}
        title={itemMode === 'create' ? 'Thêm nguyên liệu mới' : 'Chỉnh sửa nguyên liệu'}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Tên nguyên liệu <span className="text-rose-500">*</span></label>
            <input value={itemForm.ingredientName}
              onChange={(e) => setItemForm({ ...itemForm, ingredientName: e.target.value })}
              className={inputCls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Đơn vị <span className="text-rose-500">*</span></label>
              <input value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="ml, g, chai..."
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Mức tối thiểu <span className="text-rose-500">*</span></label>
              <input type="number" min={0} value={itemForm.minimumStock}
                onChange={(e) => setItemForm({ ...itemForm, minimumStock: e.target.value === '' ? '' : Number(e.target.value) })}
                className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              {itemMode === 'create' ? 'Tồn kho ban đầu' : 'Điều chỉnh tồn kho hiện tại'} <span className="text-rose-500">*</span>
            </label>
            <input type="number" min={0} value={itemForm.quantity}
              onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
              className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowItemModal(false)}
              className="rounded-xl border border-[rgba(107,80,64,0.18)] px-4 py-2.5 text-sm font-medium text-[#6b5040] hover:bg-[rgba(107,80,64,0.05)] transition">
              Hủy
            </button>
            <button onClick={handleItemSubmit} disabled={itemSaving}
              className="rounded-xl bg-[#6b5040] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50 active:scale-95 transition">
              {itemSaving ? 'Đang lưu...' : itemMode === 'create' ? 'Thêm nguyên liệu' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cập nhật giá modal */}
      <Modal open={showMarketPriceModal} onClose={() => setShowMarketPriceModal(false)}
        title={`Cập nhật giá - ${marketPriceForm.ingredientName}`}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Giá vốn nội bộ <span className="text-rose-500">*</span></label>
            <input type="number" min={0} value={marketPriceForm.unitCost}
              onChange={(e) => setMarketPriceForm((prev) => ({ ...prev, unitCost: e.target.value }))}
              className={inputCls} placeholder="Ví dụ: 38000" />
          </div>
          <div>
            <label className={labelCls}>Giá thị trường tham khảo <span className="text-rose-500">*</span></label>
            <input type="number" min={0} value={marketPriceForm.marketUnitPrice}
              onChange={(e) => setMarketPriceForm((prev) => ({ ...prev, marketUnitPrice: e.target.value }))}
              className={inputCls} placeholder="Ví dụ: 42000" />
          </div>
          <div>
            <label className={labelCls}>Nguồn giá</label>
            <input value={marketPriceForm.source}
              onChange={(e) => setMarketPriceForm((prev) => ({ ...prev, source: e.target.value }))}
              className={inputCls} placeholder="Ví dụ: Chợ đầu mối Hòa Cường" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowMarketPriceModal(false)}
              className="rounded-xl border border-[rgba(107,80,64,0.18)] px-4 py-2.5 text-sm font-medium text-[#6b5040] hover:bg-[rgba(107,80,64,0.05)] transition">
              Hủy
            </button>
            <button onClick={handleMarketPriceSubmit} disabled={marketPriceSaving}
              className="rounded-xl bg-[#6b5040] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50 active:scale-95 transition">
              {marketPriceSaving ? 'Đang lưu...' : 'Lưu giá'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lịch sử modal */}
      <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)}
        title={`Lịch sử nhập xuất — ${selectedInventory?.ingredientName ?? ''}`}>
        {historyLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[360px] overflow-auto rounded-xl border border-[rgba(107,80,64,0.1)]">
              <table className="w-full text-sm">
                <thead className="bg-[rgba(253,247,240,0.8)] sticky top-0">
                  <tr>
                    {['Thời gian', 'Loại', 'Số lượng', 'Ghi chú'].map((h) => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.4)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(107,80,64,0.05)]">
                  {historyData?.content?.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[rgba(253,247,240,0.4)] transition-colors">
                      <td className="py-2.5 px-3 text-[rgba(26,14,7,0.6)] text-xs">{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-semibold ${tx.type === 'ADD' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {tx.type === 'ADD' ? 'Nhập' : 'Xuất'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#1a0e07]">{tx.quantity}</td>
                      <td className="py-2.5 px-3 text-[rgba(26,14,7,0.65)]">{tx.reason || '—'}</td>
                    </tr>
                  ))}
                  {(!historyData || historyData.content.length === 0) && (
                    <tr><td colSpan={4} className="py-8 px-3 text-center text-sm text-[rgba(26,14,7,0.35)]">Chưa có giao dịch nhập/xuất</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {historyData && (
              <Pagination page={historyPage} totalPages={historyData.totalPages} totalElements={historyData.totalElements} onPageChange={setHistoryPage} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

