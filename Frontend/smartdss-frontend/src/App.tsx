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
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const QrOrderPage = lazy(() => import('@/pages/QrOrderPage'));
const AIPredictionPage = lazy(() => import('@/pages/AIPredictionPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/qr/:token" element={<QrOrderPage />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/categories" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><CategoriesPage /></ProtectedRoute>} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/recipes" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><RecipesPage /></ProtectedRoute>} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/table-settlement" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}><TableSettlementPage /></ProtectedRoute>} />
              <Route path="/shifts" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'STAFF']}><ShiftsPage /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><InventoryPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ReportsPage /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><FinancePage /></ProtectedRoute>} />
              <Route path="/ai-prediction" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><AIPredictionPage /></ProtectedRoute>} />
              <Route path="/feedbacks" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><FeedbacksPage /></ProtectedRoute>} />
              <Route path="/external-factors" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ExternalFactorsPage /></ProtectedRoute>} />
              <Route path="/tables" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><TablesPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
