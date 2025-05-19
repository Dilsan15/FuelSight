import { useState } from 'react';
import axios from '@/APIs/defpayOrderAPI';
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

export const useDeleteDefPayOrder = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuthContext();

  const deleteOrder = async (id) => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await axios.delete(`/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete order.');
      return null;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteOrder, isDeleting, error };
};
