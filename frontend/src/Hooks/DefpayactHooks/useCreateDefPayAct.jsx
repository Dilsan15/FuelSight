import defPayAPI from '@/APIs/defpayactAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useCreateDefPayAct = () => {
    
  const {user} = useAuthContext();
  const createAccount = async (data) => {
    try {
      const res = await defPayAPI.post('/create', data, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      return res.data;
    } catch (err) {
      console.error('❌ Create failed:', err);
      
      // Handle "User not found" error - clear localStorage and redirect to login
      if (err.response?.status === 401 && err.response?.data?.error === 'User not found') {
        console.log('🔄 User account not found in database. Clearing session and redirecting to login...');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      throw err.response?.data || { error: 'Unknown error' };
    }
  };

  return { createAccount };
};
