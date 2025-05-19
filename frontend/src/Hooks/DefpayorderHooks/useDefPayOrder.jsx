import { useState } from 'react';
import defPayAPI from '@/APIs/defpayOrderAPI';
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

export const useDefPayOrder = () => {
  const { user } = useAuthContext();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrder = async (id) => {
    setIsLoading(true);
    try {
      const res = await defPayAPI.get(`/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      setOrder(res.data);  // ✅ Save into state
    } catch (err) {
      console.error('Failed to fetch def/pay order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { order, fetchOrder, isLoading };
};
