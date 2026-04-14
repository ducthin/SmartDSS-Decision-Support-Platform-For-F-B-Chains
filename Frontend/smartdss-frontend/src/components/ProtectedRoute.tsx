import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';

interface ProtectedRouteProps {
  roles: string[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const userRole = getRoleKey(user?.roleName);

  if (!userRole || !roles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
