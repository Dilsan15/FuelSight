  // --- Hook: useDefPayOrders.js ---
  import defPayAPI from '@/APIs/defpayorderAPI';
  import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

  export const useDefPayOrders = () => {
    const { user } = useAuthContext();

    const fetchOrders = async (search = '', page = 1, limit = 10) => {
      if (!user?.token) {
        throw new Error('User token is missing.');
      }

      try {
        const res = await defPayAPI.get('/search', {
          params: {
            search: search.trim(),
            page: Number(page),
            limit: Number(limit)
          },
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
        return res.data;
      } catch (err) {
        console.error('Failed to fetch def/pay orders:', err);
        throw err.response?.data || { error: 'Unknown error' };
      }
    };

    return { fetchOrders };
  };
