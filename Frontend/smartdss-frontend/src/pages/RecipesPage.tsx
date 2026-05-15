import '@/styles/coffee-theme.css';
import { useEffect, useState, useMemo } from 'react';
import { recipeService, ingredientService, menuService } from '@/services/menuService';
import type { Recipe, RecipeForm, Ingredient, MenuItem } from '@/types';
import { Plus, Pencil, Trash2, ChevronDown, Search, X, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';

const emptyForm: RecipeForm = { menuItemId: 0, ingredientId: 0, quantity: '' };
const GROUPS_PER_PAGE = 15;

const inputCls =
  'w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.15)] bg-white';
const labelCls = 'block text-sm font-semibold text-[#1a0e07] mb-1.5';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedMenuIds, setExpandedMenuIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>(undefined);

  const load = () => {
    Promise.all([recipeService.getAll(), menuService.getAllNoPaging(), ingredientService.getAll()])
      .then(([recRes, menuRes, ingRes]) => {
        setRecipes(recRes.data.data || []);
        setMenuItems(menuRes.data.data || []);
        setIngredients(ingRes.data.data || []);
      })
      .catch(() => toast.error('Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openCreateForMenuItem = (menuItemId: number) => {
    setEditing(null);
    setForm({ ...emptyForm, menuItemId });
    setShowModal(true);
  };
  const openEdit = (r: Recipe) => {
    setEditing(r);
    setForm({ menuItemId: r.menuItemId, ingredientId: r.ingredientId, quantity: r.quantity });
    setShowModal(true);
  };

  const getUnit = (ingredientId: number) => ingredients.find((i) => i.id === ingredientId)?.unit ?? '';

  const allGroupedRecipes = useMemo(() => {
    const filteredRecipes = recipes.filter((r) => {
      const searchLower = searchText.toLowerCase();
      const matchSearch = !searchText ||
        r.menuItemName.toLowerCase().includes(searchLower) ||
        r.ingredientName.toLowerCase().includes(searchLower);
      const matchCategory = !filterCategoryId ||
        menuItems.find((m) => m.id === r.menuItemId)?.categoryId === filterCategoryId;
      return matchSearch && matchCategory;
    });

    const groups = new Map<number, Recipe[]>();
    filteredRecipes.forEach((r) => {
      if (!groups.has(r.menuItemId)) groups.set(r.menuItemId, []);
      groups.get(r.menuItemId)!.push(r);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      const nameA = menuItems.find((m) => m.id === a[0])?.name ?? '';
      const nameB = menuItems.find((m) => m.id === b[0])?.name ?? '';
      return nameA.localeCompare(nameB);
    });
  }, [recipes, menuItems, searchText, filterCategoryId]);

  const totalPages = Math.ceil(allGroupedRecipes.length / GROUPS_PER_PAGE);
  const groupedRecipes = useMemo(
    () => allGroupedRecipes.slice(page * GROUPS_PER_PAGE, (page + 1) * GROUPS_PER_PAGE),
    [allGroupedRecipes, page]
  );

  const toggleExpand = (menuId: number) => {
    const next = new Set(expandedMenuIds);
    if (next.has(menuId)) next.delete(menuId);
    else next.add(menuId);
    setExpandedMenuIds(next);
  };

  const handleSave = async () => {
    if (!form.menuItemId) return toast.error('Chọn món');
    if (!form.ingredientId) return toast.error('Chọn nguyên liệu');
    if (form.quantity === '' || Number(form.quantity) <= 0) return toast.error('Số lượng phải > 0');
    setSaving(true);
    try {
      if (editing) {
        await recipeService.update(editing.id, form);
        toast.success('Cập nhật thành công');
      } else {
        await recipeService.create(form);
        toast.success('Tạo mới thành công');
      }
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi lưu công thức'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa công thức?')) return;
    try {
      await recipeService.delete(id);
      toast.success('Đã xóa');
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi xóa'));
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0e07]">Công thức</h1>
          <p className="mt-0.5 text-sm text-[rgba(26,14,7,0.5)]">Quản lý nguyên liệu và định lượng cho từng món</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b5040] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(107,80,64,0.5)] transition hover:brightness-110 active:scale-95"
        >
          <Plus size={16} /> Thêm công thức
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)]" />
          <input
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
            placeholder="Tìm kiếm theo tên món hoặc nguyên liệu..."
            className="w-full pl-10 pr-10 py-2.5 border border-[rgba(107,80,64,0.18)] rounded-xl text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)] bg-white"
          />
          {searchText && (
            <button
              onClick={() => { setSearchText(''); setPage(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)] hover:text-[#6b5040]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={filterCategoryId ?? ''}
          onChange={(e) => { setFilterCategoryId(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
          className="px-3 py-2.5 border border-[rgba(107,80,64,0.18)] rounded-xl text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.12)] bg-white"
        >
          <option value="">Tất cả danh mục</option>
          {Array.from(new Map(
            menuItems
              .filter((m) => m.categoryId)
              .map((m) => [m.categoryId, { id: m.categoryId, name: m.categoryName || 'Không xác định' }])
          ).values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
        </select>
      </div>

      {/* Recipe groups */}
      <div className="space-y-2">
        {groupedRecipes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-[rgba(26,14,7,0.35)]">
            <BookOpen size={44} className="text-[rgba(107,80,64,0.2)]" />
            <p className="text-sm">Chưa có công thức nào.</p>
          </div>
        ) : (
          groupedRecipes.map(([menuId, items]) => {
            const menuItem = menuItems.find((m) => m.id === menuId);
            const isExpanded = expandedMenuIds.has(menuId);

            return (
              <div key={menuId} className="bg-white rounded-2xl border border-[rgba(107,80,64,0.1)] overflow-hidden shadow-[0_1px_6px_-2px_rgba(26,14,7,0.06)]">
                {/* Group header */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(253,247,240,0.6)] transition-colors">
                  <button
                    onClick={() => toggleExpand(menuId)}
                    className="flex flex-1 items-center gap-3 font-medium text-[#1a0e07] text-left"
                  >
                    <ChevronDown
                      size={18}
                      className={`text-[rgba(107,80,64,0.5)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    <span>{menuItem?.name || `Món #${menuId}`}</span>
                    <span className="text-xs text-[rgba(26,14,7,0.4)] font-normal bg-[rgba(107,80,64,0.06)] px-2 py-0.5 rounded-full">
                      {items.length} nguyên liệu
                    </span>
                  </button>
                  <button
                    onClick={() => openCreateForMenuItem(menuId)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 ml-2 bg-[rgba(201,162,122,0.12)] text-[#7a5c3e] rounded-lg text-xs font-medium hover:bg-[rgba(201,162,122,0.22)] transition whitespace-nowrap"
                  >
                    <Plus size={13} /> Thêm
                  </button>
                </div>

                {/* Expanded table */}
                {isExpanded && (
                  <div className="border-t border-[rgba(107,80,64,0.07)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[rgba(253,247,240,0.8)]">
                          <tr>
                            {['#', 'Nguyên liệu', 'Số lượng', 'Đơn vị', 'Thao tác'].map((h, i) => (
                              <th
                                key={h}
                                className={`py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)] ${i === 4 ? 'text-right' : 'text-left'}`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(107,80,64,0.05)]">
                          {items
                            .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
                            .map((r) => (
                              <tr key={r.id} className="hover:bg-[rgba(253,247,240,0.4)] transition-colors">
                                <td className="py-3 px-4 font-mono text-xs text-[rgba(107,80,64,0.45)]">{r.id}</td>
                                <td className="py-3 px-4 text-[#1a0e07]">{r.ingredientName}</td>
                                <td className="py-3 px-4 font-semibold text-[#1a0e07]">{r.quantity}</td>
                                <td className="py-3 px-4 text-[rgba(26,14,7,0.5)]">{getUnit(r.ingredientId)}</td>
                                <td className="py-3 px-4 text-right space-x-1">
                                  <button
                                    onClick={() => openEdit(r)}
                                    className="p-1.5 rounded-lg hover:bg-[rgba(107,80,64,0.08)] text-[rgba(107,80,64,0.5)] hover:text-[#6b5040] transition-colors"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(r.id)}
                                    className="p-1.5 rounded-lg hover:bg-rose-50 text-[rgba(239,68,68,0.5)] hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} totalElements={allGroupedRecipes.length} onPageChange={setPage} />
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa công thức' : 'Thêm công thức'}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Món <span className="text-rose-500">*</span></label>
            <select
              value={form.menuItemId}
              onChange={(e) => setForm({ ...form, menuItemId: Number(e.target.value) })}
              className={inputCls}
              disabled={!!editing || (form.menuItemId !== 0)}
            >
              <option value={0}>Chọn món</option>
              {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nguyên liệu <span className="text-rose-500">*</span></label>
            <select
              value={form.ingredientId}
              onChange={(e) => setForm({ ...form, ingredientId: Number(e.target.value) })}
              className={inputCls}
              disabled={!!editing}
            >
              <option value={0}>Chọn nguyên liệu</option>
              {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Số lượng <span className="text-rose-500">*</span></label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
              className={inputCls}
              min={0.01}
              step={0.01}
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-xl border border-[rgba(107,80,64,0.18)] px-4 py-2.5 text-sm font-medium text-[#6b5040] hover:bg-[rgba(107,80,64,0.05)] transition"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#6b5040] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50 active:scale-95 transition"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
