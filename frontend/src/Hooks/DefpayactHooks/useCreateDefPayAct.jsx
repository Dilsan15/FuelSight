import defPayAPI from '@/APIs/defpayactAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useCreateDefPayAct = () => {
    
  const {user} = useAuthContext();
  const createAccount = async (data) => {
    try {
      const res = await defPayAPI.post('/create', data, {
        headers: {
          Authorization: `Bearer ${user?.token}` // use optional chaining to be safe
        }
      });

      return res.data;
    } catch (err) {
      console.error('Create failed:', err);
      throw err.response?.data || { error: 'Unknown error' };
    }
  };

  return { createAccount };
};
