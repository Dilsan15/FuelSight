// --- Hook: useDefPayActs.js ---
import defPayAPI from '@/APIs/defpayactAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useDefPayActs = () => {
  const { user } = useAuthContext();

  const fetchAccounts = async (search = '', page = 1, limit = 10, searchBy = 'all') => {
    try {
      const res = await defPayAPI.get('/search', {
        params: { search, page, limit, searchBy },
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      return res.data;
    } catch (err) {
      console.error('Failed to fetch def/pay accounts:', err);
      throw err.response?.data || { error: 'Unknown error' };
    }
  };

  return { fetchAccounts };
};