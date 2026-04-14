import { useEffect, useState, useCallback } from 'react';
import { menuService, categoryService, recipeService } from '@/services/menuService';
import type { MenuItem, MenuItemForm, Category, PageResponse, Recipe, DrinkSizeOption, DrinkToppingOption } from '@/types';
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage, formatCurrency, getRoleKey } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/contexts/AuthContext';

const emptyForm: MenuItemForm = {
  name: '',
  description: '',
  price: 0,
  imageUrl: '',
  available: true,
  categoryId: 0,
  drink: false,
  drinkSizes: [],
  drinkToppings: [],
  badgeNew: false,
  badgeBestSeller: false,
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<MenuItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeItem, setRecipeItem] = useState<MenuItem | null>(null);
  const [recipeLines, setRecipeLines] = useState<Recipe[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<MenuItem> | null>(null);
  const [keyword, setKeyword] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>(undefined);
  const [filterAvailable, setFilterAvailable] = useState<boolean | undefined>(undefined);
  const debouncedKeyword = useDebounce(keyword);
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);
  const canManageMenu = ['ADMIN', 'MANAGER'].includes(userRole);

  const load = useCallback(() => {
    setLoading(true);
    const hasFilter = debouncedKeyword || filterCategoryId || filterAvailable !== undefined;
    const menuPromise = hasFilter
      ? menuService.getAll(page, 10, debouncedKeyword || undefined, filterCategoryId, filterAvailable)
      : menuService.getAll(page);
    Promise.all([menuPromise, categoryService.getAllNoPaging()])
      .then(([menuRes, catRes]) => {
        const data = menuRes.data.data;
        setItems(data.content);
        setPageData(data);
        setCategories(catRes.data.data || []);
      })
      .catch(() => toast.error('Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  }, [page, debouncedKeyword, filterCategoryId, filterAvailable]);

  useEffect(load, [load]);

  const openCreate = () => {
    if (!canManageMenu) return toast.error('Bạn không có quyền thêm/sửa/xóa menu');
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };
  const openEdit = (item: MenuItem) => {
    if (!canManageMenu) return toast.error('Bạn không có quyền thêm/sửa/xóa menu');
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      available: item.available,
      categoryId: item.categoryId,
      drink: item.drink ?? false,
      drinkSizes: item.drinkSizes?.length ? item.drinkSizes.map((s) => ({ ...s })) : [],
      drinkToppings: item.drinkToppings?.length ? item.drinkToppings.map((t) => ({ ...t })) : [],
      badgeNew: item.badgeNew ?? false,
      badgeBestSeller: item.badgeBestSeller ?? false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!canManageMenu) return toast.error('Bạn không có quyền thêm/sửa/xóa menu');
    if (!form.name.trim()) return toast.error('Tên món không được trống');
    if (form.price <= 0) return toast.error('Giá phải > 0');
    if (!form.categoryId) return toast.error('Chọn danh mục');
    if (form.drink && (!form.drinkSizes || form.drinkSizes.length === 0)) {
      return toast.error('Đồ uống cần ít nhất một size (kích cỡ)');
    }
    setSaving(true);
    try {
      if (editing) {
        await menuService.update(editing.id, form);
        toast.success('Cập nhật thành công');
      } else {
        await menuService.create(form);
        toast.success('Tạo mới thành công');
      }
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi lưu món'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canManageMenu) return toast.error('Bạn không có quyền thêm/sửa/xóa menu');
    if (!confirm('Xác nhận xóa món?')) return;
    try {
      await menuService.delete(id);
      toast.success('Đã xóa');
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi xóa'));
    }
  };

  const openRecipe = async (item: MenuItem) => {
    setRecipeItem(item);
    setShowRecipeModal(true);
    setRecipeLoading(true);
    try {
      const res = await recipeService.getByMenuItemId(item.id);
      const lines = (res.data.data || []).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
      setRecipeLines(lines);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi tải công thức'));
      setRecipeLines([]);
    } finally {
      setRecipeLoading(false);
    }
  };

  const closeRecipe = () => {
    setShowRecipeModal(false);
    setRecipeItem(null);
    setRecipeLines([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý Menu</h1>
        {canManageMenu && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus size={18} /> Thêm món
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
            placeholder="Tìm kiếm theo tên..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <select value={filterCategoryId ?? ''} onChange={(e) => { setFilterCategoryId(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterAvailable === undefined ? '' : filterAvailable ? 'true' : 'false'}
          onChange={(e) => { setFilterAvailable(e.target.value === '' ? undefined : e.target.value === 'true'); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="true">Còn bán</option>
          <option value="false">Hết hàng</option>
        </select>
      </div>

      {/* Cards grid */}
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => openRecipe(item)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRecipe(item); } }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Bấm để xem công thức pha chế"
            >
              <div className="h-40 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <span className="text-4xl">☕</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.categoryName}
                      {item.drink && (
                        <span className="ml-2 text-amber-700 font-medium">· Đồ uống (size/topping)</span>
                      )}
                      {item.badgeNew && <span className="ml-2 text-rose-600 font-medium">· Món mới</span>}
                      {item.badgeBestSeller && <span className="ml-2 text-amber-600 font-medium">· Best seller</span>}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.available ? 'Còn bán' : 'Hết hàng'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(item.price)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openRecipe(item); }}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                      title="Xem công thức"
                    >
                      <BookOpen size={16} />
                    </button>
                    {canManageMenu && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-gray-400 py-12">Chưa có món nào</p>}
        </div>}

      {pageData && (
        <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa món' : 'Thêm món mới'} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên món <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VND) <span className="text-red-500">*</span></label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục <span className="text-red-500">*</span></label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value={0}>Chọn danh mục</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đường dẫn hình ảnh (URL)</label>
            <input value={form.imageUrl ?? ''} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="https://example.com/image.jpg" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="available" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })}
              className="rounded border-gray-300" />
            <label htmlFor="available" className="text-sm text-gray-700">Còn bán</label>
          </div>
          <div className="flex flex-wrap gap-4 border-t pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.badgeNew}
                onChange={(e) => setForm({ ...form, badgeNew: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Món mới (⭐ menu QR)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.badgeBestSeller}
                onChange={(e) => setForm({ ...form, badgeBestSeller: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Best seller (🏆 menu QR)</span>
            </label>
          </div>
          <div className="flex items-center gap-2 border-t pt-3">
            <input
              type="checkbox"
              id="drink"
              checked={!!form.drink}
              onChange={(e) => {
                const drink = e.target.checked;
                setForm((f) => ({
                  ...f,
                  drink,
                  drinkSizes:
                    drink && (!f.drinkSizes || f.drinkSizes.length === 0)
                      ? [{ code: 'M', label: 'Vừa', priceExtra: 0 }]
                      : drink
                        ? f.drinkSizes
                        : [],
                  drinkToppings: drink ? f.drinkToppings : [],
                }));
              }}
              className="rounded border-gray-300"
            />
            <label htmlFor="drink" className="text-sm text-gray-700">
              Đồ uống — khách chọn size (bắt buộc) và topping (tuỳ chọn)
            </label>
          </div>
          {form.drink && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-800 mb-2">Danh sách size</div>
                <p className="text-xs text-gray-500 mb-2">Mã (vd: S, M, L) dùng khi đặt hàng; phụ phí cộng vào giá gốc món.</p>
                {(form.drinkSizes || []).map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <input
                      placeholder="Mã"
                      value={row.code}
                      onChange={(e) => {
                        const next = [...(form.drinkSizes || [])] as DrinkSizeOption[];
                        next[idx] = { ...next[idx], code: e.target.value };
                        setForm({ ...form, drinkSizes: next });
                      }}
                      className="col-span-3 px-2 py-1.5 border rounded text-sm"
                    />
                    <input
                      placeholder="Tên hiển thị"
                      value={row.label}
                      onChange={(e) => {
                        const next = [...(form.drinkSizes || [])] as DrinkSizeOption[];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setForm({ ...form, drinkSizes: next });
                      }}
                      className="col-span-5 px-2 py-1.5 border rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Phụ phí"
                      value={row.priceExtra}
                      onChange={(e) => {
                        const next = [...(form.drinkSizes || [])] as DrinkSizeOption[];
                        next[idx] = { ...next[idx], priceExtra: Number(e.target.value) };
                        setForm({ ...form, drinkSizes: next });
                      }}
                      className="col-span-3 px-2 py-1.5 border rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          drinkSizes: (form.drinkSizes || []).filter((_, i) => i !== idx),
                        })
                      }
                      className="col-span-1 text-red-500 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      drinkSizes: [...(form.drinkSizes || []), { code: '', label: '', priceExtra: 0 }],
                    })
                  }
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Thêm size
                </button>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800 mb-2">Topping (tuỳ chọn)</div>
                {(form.drinkToppings || []).map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <input
                      placeholder="Mã"
                      value={row.code}
                      onChange={(e) => {
                        const next = [...(form.drinkToppings || [])] as DrinkToppingOption[];
                        next[idx] = { ...next[idx], code: e.target.value };
                        setForm({ ...form, drinkToppings: next });
                      }}
                      className="col-span-3 px-2 py-1.5 border rounded text-sm"
                    />
                    <input
                      placeholder="Tên"
                      value={row.label}
                      onChange={(e) => {
                        const next = [...(form.drinkToppings || [])] as DrinkToppingOption[];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setForm({ ...form, drinkToppings: next });
                      }}
                      className="col-span-5 px-2 py-1.5 border rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Giá"
                      value={row.price}
                      onChange={(e) => {
                        const next = [...(form.drinkToppings || [])] as DrinkToppingOption[];
                        next[idx] = { ...next[idx], price: Number(e.target.value) };
                        setForm({ ...form, drinkToppings: next });
                      }}
                      className="col-span-3 px-2 py-1.5 border rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          drinkToppings: (form.drinkToppings || []).filter((_, i) => i !== idx),
                        })
                      }
                      className="col-span-1 text-red-500 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      drinkToppings: [...(form.drinkToppings || []), { code: '', label: '', price: 0 }],
                    })
                  }
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Thêm topping
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showRecipeModal}
        onClose={closeRecipe}
        title={recipeItem ? `Công thức: ${recipeItem.name}` : 'Công thức'}
        maxWidth="max-w-xl"
      >
        {recipeLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <div className="text-sm font-medium text-blue-900">Hỗ trợ pha chế</div>
              <div className="text-sm text-blue-700 mt-0.5">Danh sách nguyên liệu và định lượng theo công thức đã khai báo.</div>
            </div>

            {recipeItem && recipeLines.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Nguyên liệu</div>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                  {recipeLines.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2">
                      <div className="text-sm font-medium text-gray-800">{r.ingredientName}</div>
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-800">{r.quantity}</span>
                        {r.ingredientUnit ? ` ${r.ingredientUnit}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                Chưa có công thức cho món này. Vui lòng khai báo ở mục Công thức (Recipes).
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={closeRecipe} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Đóng</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
