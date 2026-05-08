import '@/styles/coffee-theme.css';
import { useEffect, useState, useCallback } from 'react';
import { userService } from '@/services/authService';
import type { User, UserForm, PageResponse } from '@/types';
import { Plus, Pencil, Trash2, Search, Users, Shield, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { getApiErrorMessage, getRoleKey } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';

const emptyForm: UserForm = { username: '', password: '', fullName: '', email: '', phone: '', active: true, roleName: 'STAFF' };

const roleOptions = [
  { name: 'ADMIN', label: 'Admin', color: 'bg-rose-50 text-rose-700' },
  { name: 'MANAGER', label: 'Manager', color: 'bg-[rgba(201,162,122,0.15)] text-[#6b5040]' },
  { name: 'STAFF', label: 'Staff', color: 'bg-[rgba(107,80,64,0.08)] text-[rgba(107,80,64,0.7)]' },
];

function getRoleBadge(roleName: string) {
  const key = getRoleKey(roleName);
  const opt = roleOptions.find((r) => r.name === key) ?? { label: key, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${opt.color}`}>
      <Shield size={9} />
      {opt.label}
    </span>
  );
}

const inputCls = 'w-full rounded-xl border border-[rgba(107,80,64,0.18)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.15)] disabled:bg-[rgba(107,80,64,0.03)] disabled:text-[rgba(26,14,7,0.45)]';
const labelCls = 'block text-sm font-semibold text-[#1a0e07] mb-1.5';

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
    setForm({ username: u.username, fullName: u.fullName, email: u.email, phone: u.phone, active: u.active, roleName: getRoleKey(u.roleName) || 'STAFF' });
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0e07]">Quản lý nhân viên</h1>
          <p className="mt-0.5 text-sm text-[rgba(26,14,7,0.5)]">Tài khoản đăng nhập và phân quyền hệ thống</p>
        </div>
        <button
          id="user-add-btn"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b5040] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(107,80,64,0.5)] transition hover:brightness-110 active:scale-95"
        >
          <Plus size={16} /> Thêm nhân viên
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(107,80,64,0.4)]" />
        <input
          id="user-search"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
          placeholder="Tìm theo tên, username, email..."
          className="w-full rounded-xl border border-[rgba(107,80,64,0.18)] bg-white pl-9 pr-4 py-2.5 text-sm outline-none transition focus:border-[#c9a27a] focus:ring-4 focus:ring-[rgba(201,162,122,0.15)]"
        />
      </div>

      {/* Table */}
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
                  {['#', 'Username', 'Họ tên', 'Email', 'SĐT', 'Vai trò', 'Trạng thái', 'Thao tác'].map((h, i) => (
                    <th key={i} className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-[rgba(26,14,7,0.45)] ${i === 7 ? 'text-right pr-5' : 'text-left'} ${i === 0 ? 'pl-5' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(107,80,64,0.05)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[rgba(253,247,240,0.5)] transition-colors">
                    <td className="pl-5 px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-[rgba(107,80,64,0.5)]">{u.id}</span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[#1a0e07]">{u.username}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(201,162,122,0.15)] text-xs font-bold text-[#c9a27a]">
                          {u.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <span className="text-[rgba(26,14,7,0.8)]">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[rgba(26,14,7,0.55)]">{u.email}</td>
                    <td className="px-4 py-3.5 text-[rgba(26,14,7,0.55)]">{u.phone || '—'}</td>
                    <td className="px-4 py-3.5">{getRoleBadge(u.roleName)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                        {u.active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {u.active ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          title="Chỉnh sửa"
                          className="rounded-lg p-1.5 text-[rgba(107,80,64,0.5)] hover:bg-[rgba(107,80,64,0.08)] hover:text-[#6b5040] transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          title="Xóa"
                          className="rounded-lg p-1.5 text-[rgba(239,68,68,0.5)] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-[rgba(26,14,7,0.35)]">
                        <Users size={36} className="text-[rgba(107,80,64,0.2)]" />
                        <span className="text-sm">Chưa có nhân viên nào</span>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa nhân viên' : 'Thêm nhân viên'} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Username <span className="text-rose-500">*</span></label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!!editing}
                className={inputCls}
                placeholder="Nhập username..."
              />
            </div>
            {!editing && (
              <div>
                <label className={labelCls}>Mật khẩu <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  value={form.password ?? ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                  placeholder="Nhập mật khẩu..."
                />
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Họ tên <span className="text-rose-500">*</span></label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputCls}
              placeholder="Nguyễn Văn A..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email <span className="text-rose-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className={labelCls}>Số điện thoại</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
                placeholder="0912345678"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Vai trò</label>
              <select
                value={form.roleName}
                onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                className={inputCls + ' cursor-pointer'}
              >
                {roleOptions.map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-[rgba(107,80,64,0.3)] accent-[#6b5040]"
                />
                <span className="text-sm font-medium text-[#1a0e07]">Hoạt động</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-xl border border-[rgba(107,80,64,0.18)] px-4 py-2.5 text-sm font-medium text-[#6b5040] transition hover:bg-[rgba(107,80,64,0.05)]"
            >
              Hủy
            </button>
            <button
              id="user-save-btn"
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
