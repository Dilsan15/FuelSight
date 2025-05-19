import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const AdminProtectedRoute = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

export default AdminProtectedRoute;
