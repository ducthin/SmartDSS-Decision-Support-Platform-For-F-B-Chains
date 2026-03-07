import { useEffect, useState, useCallback } from 'react';
import { userService } from '@/services/authService';
import type { User, UserForm, PageResponse } from '@/types';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage, getRoleKey } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';

const emptyForm: UserForm = { username: '', password: '', fullName: '', email: '', phone: '', active: true, roleId: 1 };

const roleOptions = [
  { id: 1, name: 'ADMIN' },
  { id: 2, name: 'MANAGER' },
  { id: 3, name: 'STAFF' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<User> | null>(null);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword);

  const load = useCallback(() => {
    setLoading(true);
    userService.getAll(page, 10, debouncedKeyword || undefined)
      .then((res) => {
        const data = res.data.data;
        setUsers(data.content);
        setPageData(data);
      })
      .catch(() => toast.error('Lỗi tải danh sách'))
      .finally(() => setLoading(false));
  }, [page, debouncedKeyword]);

  useEffect(load, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, fullName: u.fullName, email: u.email, phone: u.phone, active: u.active,
      roleId: roleOptions.find((r) => r.name === getRoleKey(u.roleName))?.id ?? 3 });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.username.trim()) return toast.error('Username không được trống');
    if (!form.fullName.trim()) return toast.error('Họ tên không được trống');
    if (!form.email.trim()) return toast.error('Email không được trống');
    if (!editing && !form.password?.trim()) return toast.error('Mật khẩu không được trống');
    setSaving(true);
    try {
      if (editing) {
        await userService.update(editing.id, form);
        toast.success('Cập nhật thành công');
      } else {
        await userService.create(form);
        toast.success('Tạo mới thành công');
      }
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi lưu nhân viên'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa nhân viên?')) return;
    try {
      await userService.delete(id);
      toast.success('Đã xóa');
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Lỗi xóa'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý nhân viên</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} /> Thêm nhân viên
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
          placeholder="Tìm theo tên, username, email..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div> :
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Username</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Họ tên</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">SĐT</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Vai trò</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Trạng thái</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="py-3 px-4">{u.id}</td>
                <td className="py-3 px-4 font-medium">{u.username}</td>
                <td className="py-3 px-4">{u.fullName}</td>
                <td className="py-3 px-4 text-gray-500">{u.email}</td>
                <td className="py-3 px-4 text-gray-500">{u.phone}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {getRoleKey(u.roleName)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.active ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">Chưa có nhân viên</td></tr>}
          </tbody>
        </table>
        {pageData && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={pageData.totalPages} totalElements={pageData.totalElements} onPageChange={setPage} />
          </div>
        )}
      </div>}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa nhân viên' : 'Thêm nhân viên'} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" />
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                <input type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số ĐT</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
              <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Hoạt động</span>
              </label>
            </div>
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
