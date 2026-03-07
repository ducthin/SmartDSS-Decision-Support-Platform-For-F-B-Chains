import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleKey } from '@/utils/helpers';

interface ProtectedRouteProps {
  roles: string[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { user } = useAuth();
  const userRole = getRoleKey(user?.roleName);

  if (!userRole || !roles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
