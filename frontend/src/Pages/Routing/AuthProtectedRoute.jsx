import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const AuthProtectedRoute = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <h2>Loading...</h2>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AuthProtectedRoute;