import { useState } from 'react';
import defPayAPI from '@/APIs/defpayorderAPI';
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
      console.error('Full create order error:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create order.';
      setError(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createOrder, isCreating, error };
};
