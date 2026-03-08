import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CategoriesPage from '@/pages/CategoriesPage';
import MenuPage from '@/pages/MenuPage';
import OrdersPage from '@/pages/OrdersPage';
import InventoryPage from '@/pages/InventoryPage';
import ReportsPage from '@/pages/ReportsPage';
import UsersPage from '@/pages/UsersPage';
import RecipesPage from '@/pages/RecipesPage';
import ExternalFactorsPage from '@/pages/ExternalFactorsPage';
import TablesPage from '@/pages/TablesPage';
import QrOrderPage from '@/pages/QrOrderPage';
import NotFoundPage from '@/pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/qr/:token" element={<QrOrderPage />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/categories" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><CategoriesPage /></ProtectedRoute>} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/recipes" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><RecipesPage /></ProtectedRoute>} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/inventory" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><InventoryPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/external-factors" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><ExternalFactorsPage /></ProtectedRoute>} />
            <Route path="/tables" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><TablesPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
