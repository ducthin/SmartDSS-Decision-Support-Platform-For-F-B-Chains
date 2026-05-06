import { useEffect, useState, useMemo } from 'react';
import { recipeService, ingredientService, menuService } from '@/services/menuService';
import type { Recipe, RecipeForm, Ingredient, MenuItem } from '@/types';
import { Plus, Pencil, Trash2, ChevronDown, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';

const emptyForm: RecipeForm = { menuItemId: 0, ingredientId: 0, quantity: 0 };
const GROUPS_PER_PAGE = 15;

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

  // Group recipes by menu item
  const allGroupedRecipes = useMemo(() => {
    // Filter recipes based on search and category
    const filteredRecipes = recipes.filter((r) => {
      const searchLower = searchText.toLowerCase();
      const matchSearch = !searchText || 
        r.menuItemName.toLowerCase().includes(searchLower) || 
        r.ingredientName.toLowerCase().includes(searchLower);
      
      const matchCategory = !filterCategoryId || 
        menuItems.find((m) => m.id === r.menuItemId)?.categoryId === filterCategoryId;
      
      return matchSearch && matchCategory;
    });

    // Group by menu item
    const groups = new Map<number, Recipe[]>();
    filteredRecipes.forEach((r) => {
      if (!groups.has(r.menuItemId)) groups.set(r.menuItemId, []);
      groups.get(r.menuItemId)!.push(r);
    });

    // Sort groups by menu item name
    return Array.from(groups.entries())
      .sort((a, b) => {
        const nameA = menuItems.find((m) => m.id === a[0])?.name ?? '';
        const nameB = menuItems.find((m) => m.id === b[0])?.name ?? '';
        return nameA.localeCompare(nameB);
      });
  }, [recipes, menuItems, searchText, filterCategoryId]);

  // Paginate groups
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
    if (form.quantity <= 0) return toast.error('Số lượng phải > 0');
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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Công thức</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} /> Thêm công thức
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
            placeholder="Tìm kiếm theo tên món hoặc nguyên liệu..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          {searchText && (
            <button
              onClick={() => { setSearchText(''); setPage(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <select
          value={filterCategoryId ?? ''}
          onChange={(e) => { setFilterCategoryId(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        >
          <option value="">Tất cả danh mục</option>
          {Array.from(new Map(
            menuItems
              .filter((m) => m.categoryId)
              .map((m) => [m.categoryId, { id: m.categoryId, name: m.categoryName || 'Không xác định' }])
          ).values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-2">
        {groupedRecipes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400">
            Chưa có công thức
          </div>
        ) : (
          groupedRecipes.map(([menuId, items]) => {
            const menuItem = menuItems.find((m) => m.id === menuId);
            const isExpanded = expandedMenuIds.has(menuId);

            return (
              <div key={menuId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition border-0">
                  <button
                    onClick={() => toggleExpand(menuId)}
                    className="flex flex-1 items-center gap-3 font-medium text-gray-800 text-left"
                  >
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    <span>{menuItem?.name || `Món #${menuId}`}</span>
                    <span className="text-sm text-gray-500 font-normal">({items.length} công thức)</span>
                  </button>
                  <button
                    onClick={() => openCreateForMenuItem(menuId)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 ml-2 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 whitespace-nowrap"
                  >
                    <Plus size={14} /> Thêm công thức
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">Nguyên liệu</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">Số lượng</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">Đơn vị</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-500">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items
                            .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
                            .map((r) => (
                              <tr key={r.id} className="border-t border-gray-100">
                                <td className="py-3 px-4 text-gray-500">{r.id}</td>
                                <td className="py-3 px-4">{r.ingredientName}</td>
                                <td className="py-3 px-4 font-medium">{r.quantity}</td>
                                <td className="py-3 px-4 text-gray-500">{getUnit(r.ingredientId)}</td>
                                <td className="py-3 px-4 text-right space-x-2">
                                  <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={16} /></button>
                                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa công thức' : 'Thêm công thức'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Món <span className="text-red-500">*</span></label>
            <select value={form.menuItemId} onChange={(e) => setForm({ ...form, menuItemId: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={!!editing || (form.menuItemId !== 0)}>
              <option value={0}>Chọn món</option>
              {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nguyên liệu <span className="text-red-500">*</span></label>
            <select value={form.ingredientId} onChange={(e) => setForm({ ...form, ingredientId: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={!!editing}>
              <option value={0}>Chọn nguyên liệu</option>
              {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng <span className="text-red-500">*</span></label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min={0.01} step={0.01} />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
