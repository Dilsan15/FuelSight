import { useState } from 'react';
import defPayAPI from '@/APIs/defpayorderAPI';
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

export const useDefPayOrder = () => {
  const { user } = useAuthContext();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrder = async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await defPayAPI.get(`/${id}`, {
        headers: {
          Authorization: `Bearer ${user?.token}`
        }
      });
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to fetch def/pay order:', err);
      setError('Failed to load order');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { order, fetchOrder, isLoading, error };
};
