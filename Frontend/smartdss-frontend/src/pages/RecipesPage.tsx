import { useEffect, useState } from 'react';
import { recipeService, ingredientService, menuService } from '@/services/menuService';
import type { Recipe, RecipeForm, Ingredient, MenuItem } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/helpers';

const emptyForm: RecipeForm = { menuItemId: 0, ingredientId: 0, quantity: 0 };

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterMenuId, setFilterMenuId] = useState<number>(0);

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
  const openEdit = (r: Recipe) => {
    setEditing(r);
    setForm({ menuItemId: r.menuItemId, ingredientId: r.ingredientId, quantity: r.quantity });
    setShowModal(true);
  };

  const getUnit = (ingredientId: number) => ingredients.find((i) => i.id === ingredientId)?.unit ?? '';

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

  const filtered = filterMenuId ? recipes.filter((r) => r.menuItemId === filterMenuId) : recipes;

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Công thức</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} /> Thêm công thức
        </button>
      </div>

      <div>
        <select value={filterMenuId} onChange={(e) => setFilterMenuId(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option value={0}>Tất cả món</option>
          {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Món</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Nguyên liệu</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Số lượng</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Đơn vị</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-3 px-4">{r.id}</td>
                <td className="py-3 px-4 font-medium">{r.menuItemName}</td>
                <td className="py-3 px-4">{r.ingredientName}</td>
                <td className="py-3 px-4">{r.quantity}</td>
                <td className="py-3 px-4 text-gray-500">{getUnit(r.ingredientId)}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Chưa có công thức</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa công thức' : 'Thêm công thức'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Món <span className="text-red-500">*</span></label>
            <select value={form.menuItemId} onChange={(e) => setForm({ ...form, menuItemId: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={!!editing}>
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
