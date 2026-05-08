import '@/styles/coffee-theme.css';
import { useEffect, useState, useCallback } from 'react';
import { categoryService } from '@/services/menuService';
import type { Category, CategoryForm, PageResponse } from '@/types';
import { Plus, Pencil, Trash2, Search, FolderTree, Tag } from 'lucide-react';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0e07]">Danh mục</h1>
          <p className="mt-0.5 text-sm text-[rgba(26,14,7,0.5)]">Quản lý danh mục sản phẩm trong thực đơn</p>
        </div>
        <button
          id="category-add-btn"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b5040] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(107,80,64,0.5)] transition hover:brightness-110 active:scale-95"
        >
          <Plus size={16} /> Thêm danh mục
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)]" />
        <input
          id="category-search"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
          placeholder="Tìm kiếm danh mục..."
          className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] bg-white pl-9 pr-4 py-2.5 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.15)]"
        />
      </div>

      {/* Table card */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(107,80,64,0.15)] border-t-[#c9a27a]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[rgba(107,80,64,0.10)] bg-white shadow-[0_2px_12px_-4px_rgba(26,14,7,0.08)]">

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(107,80,64,0.07)] bg-[rgba(253,247,240,0.6)]">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)]">#</th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)]">Tên danh mục</th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)]">Mô tả</th>
                  <th className="px-3 py-3.5 pr-5 text-right text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(107,80,64,0.05)]">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[rgba(253,247,240,0.5)] transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-[rgba(107,80,64,0.5)]">{cat.id}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(201,162,122,0.12)]">
                          <Tag size={12} className="text-[#c9a27a]" />
                        </div>
                        <span className="font-semibold text-[#1a0e07]">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-[rgba(26,14,7,0.55)] max-w-xs truncate">{cat.description || '—'}</td>
                    <td className="px-3 py-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(cat)}
                          title="Chỉnh sửa"
                          className="rounded-lg p-1.5 text-[rgba(107,80,64,0.5)] hover:bg-[rgba(107,80,64,0.08)] hover:text-[#6b5040] transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          title="Xóa"
                          className="rounded-lg p-1.5 text-[rgba(239,68,68,0.5)] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-[rgba(26,14,7,0.35)]">
                        <FolderTree size={36} className="text-[rgba(107,80,64,0.2)]" />
                        <span className="text-sm">Chưa có danh mục nào</span>
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

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1a0e07] mb-1.5">
              Tên danh mục <span className="text-rose-500">*</span>
            </label>
            <input
              id="category-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nhập tên danh mục..."
              className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.15)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1a0e07] mb-1.5">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ngắn về danh mục..."
              className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.15)]"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-xl border border-[rgba(107,80,64,0.18)] px-4 py-2.5 text-sm font-medium text-[#6b5040] transition hover:bg-[rgba(107,80,64,0.05)]"
            >
              Hủy
            </button>
            <button
              id="category-save-btn"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#6b5040] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 active:scale-95"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
