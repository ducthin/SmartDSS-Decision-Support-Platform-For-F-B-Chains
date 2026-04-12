import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey, formatRoleName } from '@/utils/helpers';
import {
  LayoutDashboard, Coffee, ShoppingCart, Package, BarChart3,
  Users, ChevronLeft, ChevronRight, LogOut, Menu as MenuIcon,
  FolderTree, BookOpen, CloudSun, QrCode, Settings, MessageSquareText, Brain, Wallet
} from 'lucide-react';

const navItems = [
  // Tổng quan
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },

  // Vận hành hằng ngày
  { path: '/orders', label: 'Đơn hàng', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/table-settlement', label: 'Quản lý Bàn', icon: Wallet, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/tables', label: 'Quản lý QR bàn', icon: QrCode, roles: ['ADMIN', 'MANAGER'] },
  { path: '/menu', label: 'Menu', icon: Coffee, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/categories', label: 'Danh mục', icon: FolderTree, roles: ['ADMIN', 'MANAGER'] },
  { path: '/recipes', label: 'Công thức', icon: BookOpen, roles: ['ADMIN', 'MANAGER'] },
  { path: '/inventory', label: 'Kho hàng', icon: Package, roles: ['ADMIN', 'MANAGER'] },

  // Phân tích và tối ưu
  { path: '/reports',        label: 'Báo cáo',     icon: BarChart3,          roles: ['ADMIN', 'MANAGER'] },
  { path: '/ai-prediction',  label: 'AI Dự báo',   icon: Brain,              roles: ['ADMIN', 'MANAGER'] },
  { path: '/external-factors', label: 'Yếu tố ngoài', icon: CloudSun, roles: ['ADMIN', 'MANAGER'] },
  { path: '/feedbacks',      label: 'Feedback KH', icon: MessageSquareText,  roles: ['ADMIN', 'MANAGER'] },

  // Quản trị hệ thống
  { path: '/users', label: 'Nhân viên', icon: Users, roles: ['ADMIN'] },
  { path: '/settings', label: 'Cài đặt', icon: Settings, roles: ['ADMIN'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const userRole = getRoleKey(user?.roleName);

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col transition-all duration-300`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
        {!collapsed && <span className="text-xl font-bold text-blue-600">SmartDSS</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-gray-100">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-200 p-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
            {user?.fullName?.charAt(0) ?? '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500">{formatRoleName(user?.roleName)}</p>
            </div>
          )}
          <button onClick={logout} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Đăng xuất">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const userRole = getRoleKey(user?.roleName);
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      <header className="lg:hidden bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4">
        <span className="text-lg font-bold text-blue-600">SmartDSS</span>
        <button onClick={() => setOpen(!open)} className="p-2 rounded hover:bg-gray-100">
          <MenuIcon size={20} />
        </button>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <div className="w-64 bg-white h-full p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="text-xl font-bold text-blue-600 mb-6">SmartDSS</div>
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 text-red-500 w-full mt-4">
              <LogOut size={20} /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </>
  );
}
