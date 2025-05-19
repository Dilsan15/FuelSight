import defPayAPI from '@/APIs/defpayactAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useUpdateDefPayAct = () => {

  const {user} = useAuthContext()
  const updateAccount = async (id, updates) => {
    try {
      const res = await defPayAPI.put(`/update/${id}`, updates, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }});
      return res.data;
    } catch (err) {
      console.error('Update failed:', err);
      throw err.response?.data || { error: 'Unknown error' };
    }
  };

  return { updateAccount };
};
