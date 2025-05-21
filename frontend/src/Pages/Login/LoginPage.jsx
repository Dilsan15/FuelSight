import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';
import LoginForm from '@/components/Forms/LoginForm';

export default function Login() {

  const { user } = useAuthContext();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin-shifts', { replace: true });
      } else if (user.role === 'worker') {
        navigate('/submit-shift', { replace: true });
      }
    }
  }, [user, navigate]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoginForm />
    </div>
  );
}
