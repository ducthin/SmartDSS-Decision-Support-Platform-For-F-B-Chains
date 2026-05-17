import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getRoleKey } from '@/utils/helpers';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'));
const MenuPage = lazy(() => import('@/pages/MenuPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const InvoiceRequestsPage = lazy(() => import('@/pages/InvoiceRequestsPage'));
const TableSettlementPage = lazy(() => import('@/pages/TableSettlementPage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const ShiftsPage = lazy(() => import('@/pages/ShiftsPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const FinancePage = lazy(() => import('@/pages/FinancePage'));
const FeedbacksPage = lazy(() => import('@/pages/FeedbacksPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const RecipesPage = lazy(() => import('@/pages/RecipesPage'));
const ExternalFactorsPage = lazy(() => import('@/pages/ExternalFactorsPage'));
const TablesPage = lazy(() => import('@/pages/TablesPage'));
const BookingsPage = lazy(() => import('@/pages/BookingsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const QrOrderPage = lazy(() => import('@/pages/QrOrderPage'));
const OrderTrackingPage = lazy(() => import('@/pages/OrderTrackingPage'));
const AIPredictionPage = lazy(() => import('@/pages/AIPredictionPage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const PublicMenuPage = lazy(() => import('@/pages/PublicMenuPage'));
const NotificationTestPage = lazy(() => import('@/pages/NotificationTestPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const TelegramLinkPage = lazy(() => import('@/pages/TelegramLinkPage'));
const TelegramQrAdminPage = lazy(() => import('@/pages/TelegramQrAdminPage'));

function HomeRoute() {
  const { user } = useAuth();
  const role = getRoleKey(user?.roleName);
  const canViewDashboard = role === 'ADMIN' || role === 'MANAGER';

  if (canViewDashboard) return <DashboardPage />;
  return <Navigate to="/orders" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Đang tải trang...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/coffee-shop" element={<Navigate to="/" replace />} />
            <Route path="/menu" element={<PublicMenuPage />} />
            <Route path="/order-tracking" element={<OrderTrackingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/telegram" element={<TelegramLinkPage />} />
            <Route path="/qr/:token" element={<QrOrderPage />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<HomeRoute />} />
              <Route path="/categories" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><CategoriesPage /></ProtectedRoute>} />
              <Route path="/items" element={<MenuPage />} />
              <Route path="/recipes" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><RecipesPage /></ProtectedRoute>} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/invoice-requests" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><InvoiceRequestsPage /></ProtectedRoute>} />
              <Route path="/table-settlement" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}><TableSettlementPage /></ProtectedRoute>} />
              <Route path="/shifts" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}><ShiftsPage /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><InventoryPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ReportsPage /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><FinancePage /></ProtectedRoute>} />
              <Route path="/ai-prediction" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><AIPredictionPage /></ProtectedRoute>} />
              <Route path="/feedbacks" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><FeedbacksPage /></ProtectedRoute>} />
              <Route path="/promotions" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ExternalFactorsPage /></ProtectedRoute>} />
              <Route path="/external-factors" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ExternalFactorsPage /></ProtectedRoute>} />
              <Route path="/tables" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><TablesPage /></ProtectedRoute>} />
              <Route path="/telegram-qr" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}><TelegramQrAdminPage /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><BookingsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
              <Route path="/admin/notification-test" element={<ProtectedRoute roles={['ADMIN']}><NotificationTestPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Toaster position="top-center" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
