import { useEffect, useState, useCallback } from 'react';
import { inventoryService } from '@/services/inventoryService';
import type { Inventory, InventoryTransactionForm, PageResponse } from '@/types';
import { Plus, Minus, AlertTriangle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'deduct'>('add');
  const [form, setForm] = useState<InventoryTransactionForm>({ inventoryId: 0, quantity: 0, reason: '' });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<Inventory> | null>(null);
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
            {inventory.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Chưa có nguyên liệu</td></tr>}
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
    </div>
  );
}
