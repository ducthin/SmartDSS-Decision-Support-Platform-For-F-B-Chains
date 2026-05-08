import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey, formatRoleName } from '@/utils/helpers';
import logoImg from '@/assets/img/logo.png';
import {
  LayoutDashboard, Coffee, ShoppingCart, Package, BarChart3,
  Users, ChevronLeft, ChevronRight, LogOut, Menu as MenuIcon,
  FolderTree, BookOpen, CloudSun, QrCode, Settings, MessageSquareText, Brain, Wallet, CalendarClock, FileText, CalendarCheck2, Gift
} from 'lucide-react';

const navGroups = [
  {
    label: 'Tổng quan',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { path: '/orders', label: 'Đơn hàng', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/invoice-requests', label: 'Yêu cầu hóa đơn', icon: FileText, roles: ['ADMIN', 'MANAGER'] },
      { path: '/shifts', label: 'Ca làm', icon: CalendarClock, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/table-settlement', label: 'Quản lý Bàn', icon: Wallet, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/bookings', label: 'Đặt bàn', icon: CalendarCheck2, roles: ['ADMIN', 'MANAGER'] },
      { path: '/tables', label: 'QR Bàn', icon: QrCode, roles: ['ADMIN', 'MANAGER'] },
      { path: '/items', label: 'Menu', icon: Coffee, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/categories', label: 'Danh mục', icon: FolderTree, roles: ['ADMIN', 'MANAGER'] },
      { path: '/recipes', label: 'Công thức', icon: BookOpen, roles: ['ADMIN', 'MANAGER'] },
      { path: '/inventory', label: 'Kho hàng', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'Phân tích',
    items: [
      { path: '/reports', label: 'Báo cáo', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
      { path: '/finance', label: 'Tài chính', icon: Wallet, roles: ['ADMIN', 'MANAGER'] },
      { path: '/ai-prediction', label: 'AI Dự báo', icon: Brain, roles: ['ADMIN', 'MANAGER'] },
      { path: '/promotions', label: 'Ưu đãi', icon: Gift, roles: ['ADMIN', 'MANAGER'] },
      { path: '/external-factors', label: 'Yếu tố ngoài', icon: CloudSun, roles: ['ADMIN', 'MANAGER'] },
      { path: '/feedbacks', label: 'Feedback KH', icon: MessageSquareText, roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { path: '/users', label: 'Nhân viên', icon: Users, roles: ['ADMIN'] },
      { path: '/settings', label: 'Cài đặt', icon: Settings, roles: ['ADMIN'] },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const userRole = getRoleKey(user?.roleName);

  return (
    <aside
      className={`${
        collapsed ? 'w-[68px]' : 'w-64'
      } bg-[#3d2212] h-screen sticky top-0 flex flex-col transition-all duration-300 overflow-hidden`}
    >
      {/* Logo bar */}
      <div className="h-16 flex items-center justify-center border-b border-[rgba(243,228,208,0.12)] shrink-0 relative">
        {!collapsed && (
          <img
            src={logoImg}
            alt="SmartDSS"
            className="h-12 w-auto max-w-[140px] object-contain brightness-0 invert opacity-90"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors ${collapsed ? '' : 'absolute right-3'}`}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3 overflow-y-auto sidebar-nav">
        {navGroups.map((group) => {
          const filteredItems = group.items.filter((item) => item.roles.includes(userRole));
          if (filteredItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-1">
              {/* Group label */}
              {!collapsed && (
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.45)]">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="h-2" />}
              {/* Items */}
              <div className="space-y-0.5 px-2">
                {filteredItems.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-[rgba(255,255,255,0.15)] text-white'
                          : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                      }`}
                    >
                      {/* Active indicator */}
                      <span
                        className={`absolute left-0 h-5 w-0.5 rounded-r-full bg-white transition-all duration-200 ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <item.icon
                        size={18}
                        className={`shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-[rgba(255,255,255,0.55)] group-hover:text-white'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-[rgba(243,228,208,0.12)] p-3 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.2)] text-sm font-bold text-white">
            {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
              <p className="text-xs text-[rgba(255,255,255,0.5)]">{formatRoleName(user?.roleName)}</p>
            </div>
          )}
          <button
            onClick={logout}
            title="Đăng xuất"
            className="p-1.5 rounded-lg text-[rgba(255,255,255,0.5)] hover:bg-[rgba(239,68,68,0.15)] hover:text-red-300 transition-colors"
          >
            <LogOut size={16} />
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

  return (
    <>
      <header className="lg:hidden bg-[#3d2212] h-14 flex items-center justify-between px-4 shrink-0">
        <img
          src={logoImg}
          alt="SmartDSS"
          className="h-10 w-auto max-w-[120px] object-contain brightness-0 invert opacity-90"
        />
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
        >
          <MenuIcon size={20} />
        </button>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[rgba(26,14,7,0.75)]" onClick={() => setOpen(false)}>
          <div
            className="w-72 bg-[#3d2212] h-full flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile header */}
            <div className="h-14 flex items-center px-4 border-b border-[rgba(243,228,208,0.12)]">
              <img
                src={logoImg}
                alt="SmartDSS"
                className="h-10 w-auto max-w-[120px] object-contain brightness-0 invert opacity-90"
              />
            </div>

            <nav className="flex-1 py-3 px-2 space-y-0.5">
              {navGroups.map((group) => {
                const filteredItems = group.items.filter((item) => item.roles.includes(userRole));
                if (filteredItems.length === 0) return null;
                return (
                  <div key={group.label} className="mb-1">
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.45)]">
                      {group.label}
                    </p>
                    {filteredItems.map((item) => {
                      const isActive =
                        location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[rgba(255,255,255,0.15)] text-white'
                              : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                          }`}
                        >
                          <item.icon size={18} className="shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            {/* User footer mobile */}
            <div className="border-t border-[rgba(243,228,208,0.12)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.2)] text-sm font-bold text-white">
                  {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">{formatRoleName(user?.roleName)}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-[rgba(255,255,255,0.5)] hover:text-red-300 hover:bg-[rgba(239,68,68,0.15)] transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
