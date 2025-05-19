import { useState } from 'react';
import defPayAPI from '@/APIs/defpayOrderAPI';
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

export const useCreateDefPayOrder = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuthContext();

  const createOrder = async (orderData) => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await defPayAPI.post('/', orderData, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order.');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createOrder, isCreating, error };
};
