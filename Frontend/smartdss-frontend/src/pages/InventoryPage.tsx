import { useEffect, useState, useCallback } from 'react';
import { inventoryService } from '@/services/inventoryService';
import type { Inventory, InventoryItemForm, InventoryTransactionForm, InventoryTransactionHistory, PageResponse } from '@/types';
import { Plus, Minus, AlertTriangle, Search, PenSquare, History } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { formatCurrency, getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function InventoryPage() {
  const emptyItemForm: InventoryItemForm = { ingredientName: '', unit: '', quantity: 0, minimumStock: 0 };
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'deduct'>('add');
  const [form, setForm] = useState<InventoryTransactionForm>({ inventoryId: 0, quantity: 0, reason: '' });
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
    setForm({ inventoryId: inv.id, quantity: 0, reason: '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (form.quantity <= 0) return toast.error('Số lượng phải > 0');
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
    if (itemForm.quantity < 0) return toast.error('Tồn kho phải >= 0');
    if (itemForm.minimumStock < 0) return toast.error('Mức tối thiểu phải >= 0');

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quản lý kho</h1>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
            placeholder="Tìm kiếm nguyên liệu..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
          <input type="checkbox" checked={lowStockFilter === true}
            onChange={(e) => { setLowStockFilter(e.target.checked ? true : undefined); setPage(0); }}
            className="rounded border-gray-300" />
          <AlertTriangle size={16} className="text-orange-500" />
          Chỉ hiện sắp hết
        </label>
        <button
          onClick={openCreateItemModal}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          <Plus size={16} />
          Thêm nguyên liệu
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div> :
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Nguyên liệu</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Tồn kho</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Đơn vị</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Mức tối thiểu</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Giá vốn nội bộ</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Giá thị trường tham khảo</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Trạng thái</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((inv) => {
              const isLow = inv.quantity <= inv.minimumStock;
              return (
                <tr key={inv.id} className={`border-t border-gray-100 ${isLow ? 'bg-red-50' : ''}`}>
                  <td className="py-3 px-4 font-medium">{inv.ingredientName}</td>
                  <td className="py-3 px-4">{inv.quantity}</td>
                  <td className="py-3 px-4 text-gray-500">{inv.unit}</td>
                  <td className="py-3 px-4 text-gray-500">{inv.minimumStock}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {inv.unitCost != null ? formatCurrency(inv.unitCost) : <span className="text-gray-400">Chưa có</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {inv.marketUnitPrice != null ? (
                      <div className="leading-tight">
                        <div>{formatCurrency(inv.marketUnitPrice)}</div>
                        {inv.marketPriceSource && <div className="text-xs text-gray-400">Nguồn: {inv.marketPriceSource}</div>}
                        {inv.marketPriceUpdatedAt && (
                          <div className="text-xs text-gray-400">Cập nhật: {new Date(inv.marketPriceUpdatedAt).toLocaleString('vi-VN')}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Chưa có</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {isLow ? (
                      <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                        <AlertTriangle size={14} /> Sắp hết
                      </span>
                    ) : (
                      <span className="text-green-600 text-xs font-medium">Đủ hàng</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button onClick={() => openHistoryModal(inv)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">
                      <History size={14} /> Lịch sử
                    </button>
                    <button onClick={() => openEditItemModal(inv)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                      <PenSquare size={14} /> Sửa
                    </button>
                    <button onClick={() => openMarketPriceModal(inv)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs hover:bg-violet-200">
                      <PenSquare size={14} /> Giá TT
                    </button>
                    <button onClick={() => openModal('add', inv)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                      <Plus size={14} /> Nhập
                    </button>
                    <button onClick={() => openModal('deduct', inv)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200">
                      <Minus size={14} /> Xuất
                    </button>
                  </td>
                </tr>
              );
            })}
            {inventory.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">Chưa có nguyên liệu</td></tr>}
          </tbody>
        </table>
        {pageData && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
          </div>
        )}
      </div>}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={modalType === 'add' ? 'Nhập kho' : 'Xuất kho'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng <span className="text-red-500">*</span></label>
            <input type="number" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min={1} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
            <button onClick={handleSubmit} disabled={saving}
              className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${modalType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
              {saving ? 'Đang xử lý...' : modalType === 'add' ? 'Nhập' : 'Xuất'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={itemMode === 'create' ? 'Thêm nguyên liệu mới' : 'Chỉnh sửa nguyên liệu'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên nguyên liệu <span className="text-red-500">*</span></label>
            <input
              value={itemForm.ingredientName}
              onChange={(e) => setItemForm({ ...itemForm, ingredientName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị <span className="text-red-500">*</span></label>
              <input
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="ví dụ: ml, g, chai..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức tối thiểu <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={0}
                value={itemForm.minimumStock}
                onChange={(e) => setItemForm({ ...itemForm, minimumStock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {itemMode === 'create' ? 'Tồn kho ban đầu' : 'Điều chỉnh tồn kho hiện tại'} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={itemForm.quantity}
              onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowItemModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleItemSubmit}
              disabled={itemSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {itemSaving ? 'Đang lưu...' : itemMode === 'create' ? 'Thêm nguyên liệu' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showMarketPriceModal}
        onClose={() => setShowMarketPriceModal(false)}
        title={`Cập nhật giá thị trường - ${marketPriceForm.ingredientName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá vốn nội bộ <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={0}
              value={marketPriceForm.unitCost}
              onChange={(e) => setMarketPriceForm((prev) => ({ ...prev, unitCost: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
              placeholder="Ví dụ: 38000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá thị trường tham khảo <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={0}
              value={marketPriceForm.marketUnitPrice}
              onChange={(e) => setMarketPriceForm((prev) => ({ ...prev, marketUnitPrice: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
              placeholder="Ví dụ: 42000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn giá</label>
            <input
              value={marketPriceForm.source}
              onChange={(e) => setMarketPriceForm((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
              placeholder="Ví dụ: Chợ đầu mối Hòa Cường"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowMarketPriceModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleMarketPriceSubmit}
              disabled={marketPriceSaving}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {marketPriceSaving ? 'Đang lưu...' : 'Lưu giá nguyên liệu'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Lịch sử nhập xuất - ${selectedInventory?.ingredientName ?? ''}`}
      >
        {historyLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[360px] overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Thời gian</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Loại</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Số lượng</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData?.content?.map((tx) => (
                    <tr key={tx.id} className="border-t border-gray-100">
                      <td className="py-2 px-3 text-gray-600">{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs font-medium ${tx.type === 'ADD' ? 'text-green-700' : 'text-orange-700'}`}>
                          {tx.type === 'ADD' ? 'Nhập' : 'Xuất'}
                        </span>
                      </td>
                      <td className="py-2 px-3">{tx.quantity}</td>
                      <td className="py-2 px-3 text-gray-700">{tx.reason || '-'}</td>
                    </tr>
                  ))}
                  {(!historyData || historyData.content.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-6 px-3 text-center text-gray-400">Chưa có giao dịch nhập/xuất</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {historyData && (
              <Pagination
                page={historyPage}
                totalPages={historyData.totalPages}
                totalElements={historyData.totalElements}
                onPageChange={setHistoryPage}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
