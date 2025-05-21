import defPayAPI from "@/APIs/defpayactAPI"
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useDeleteDefPayAct = () => {
  const {user} = useAuthContext()
  const deleteAccount = async (id) => {
    try {
      const res = await defPayAPI.delete(`/delete/${id}`,{
        headers: {
          Authorization: `Bearer ${user?.token}`
        }}
      );
      return res.data;
    } catch (err) {
      console.error('Delete failed:', err);
      throw err.response?.data || { error: 'Unknown error' };
    }
  };

  return { deleteAccount };
};
