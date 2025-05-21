import { useState } from 'react';
import defPayAPI from '@/APIs/defpayorderAPI';
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

export const useUpdateDefPayOrder = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuthContext();

  const updateOrder = async (id, updates) => {
    setIsUpdating(true);
    setError(null);
    try {
      const res = await defPayAPI.patch(`/${id}`, updates, {
        headers: {
          Authorization: `Bearer ${user?.token}`
        }
      });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update order.');
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateOrder, isUpdating, error };
};
