import { useAuthContext } from "../AuthHooks/useAuthContext";
import defPayAPI from "@/APIs/defpayactAPI"


export const useDefPayActs = () => {
  const { user } = useAuthContext();

  const fetchAccounts = async (
    search = '',
    page = 1,
    limit = 10,
    searchBy = 'all',
    sortBy = 'createdAt',
    order = 'desc'
  ) => {
    try {
      const res = await defPayAPI.get('/search', {
        params: { search, page, limit, searchBy, sortBy, order },
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
