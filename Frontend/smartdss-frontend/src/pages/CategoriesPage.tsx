import { useEffect, useState, useCallback } from 'react';
import { categoryService } from '@/services/menuService';
import type { Category, CategoryForm, PageResponse } from '@/types';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<Category> | null>(null);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword);

  const load = useCallback(() => {
    setLoading(true);
    categoryService.getAll(page, 10, debouncedKeyword || undefined)
      .then((res) => {
        const data = res.data.data;
        setCategories(data.content);
        setPageData(data);
      })
      .catch(() => toast.error('Lỗi tải danh mục'))
      .finally(() => setLoading(false));
  }, [page, debouncedKeyword]);

  useEffect(load, [load]);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setForm({ name: cat.name, description: cat.description }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Tên danh mục không được trống');
    setSaving(true);
    try {
      if (editing) {
        await categoryService.update(editing.id, form);
        toast.success('Cập nhật thành công');
      } else {
        await categoryService.create(form);
        toast.success('Tạo mới thành công');
      }
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi lưu danh mục'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa danh mục?')) return;
    try {
      await categoryService.delete(id);
      toast.success('Đã xóa');
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi xóa danh mục'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Danh mục</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#F4A825] text-white px-4 py-2 rounded-lg hover:bg-[#D48806] transition">
          <Plus size={18} /> Thêm danh mục
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1887F]" />
        <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
          placeholder="Tìm kiếm danh mục..."
          className="w-full pl-10 pr-3 py-2 border border-[#DCC2A8] rounded-lg focus:ring-2 focus:ring-[#F4A825] outline-none text-sm" />
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div> :
      <div className="bg-white rounded-xl border border-[#E4CFB4] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF6EC]">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-[#6D4C41]">#</th>
              <th className="text-left py-3 px-4 font-medium text-[#6D4C41]">Tên</th>
              <th className="text-left py-3 px-4 font-medium text-[#6D4C41]">Mô tả</th>
              <th className="text-right py-3 px-4 font-medium text-[#6D4C41]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-t border-[#F1E4D6]">
                <td className="py-3 px-4">{cat.id}</td>
                <td className="py-3 px-4 font-medium">{cat.name}</td>
                <td className="py-3 px-4 text-[#6D4C41]">{cat.description}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded hover:bg-[#F5E6D3] text-[#6D4C41]"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-[#A1887F]">Chưa có danh mục</td></tr>}
          </tbody>
        </table>
        {pageData && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
          </div>
        )}
      </div>}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-1">Tên danh mục <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#DCC2A8] rounded-lg focus:ring-2 focus:ring-[#F4A825] outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-1">Mô tả</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#DCC2A8] rounded-lg focus:ring-2 focus:ring-[#F4A825] outline-none" rows={3} />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-[#DCC2A8] rounded-lg hover:bg-[#FDF6EC]">Hủy</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#F4A825] text-white rounded-lg hover:bg-[#D48806] disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


