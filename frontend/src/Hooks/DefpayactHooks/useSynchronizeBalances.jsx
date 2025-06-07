import { useState } from 'react';
import defpayactAPI from '@/APIs/defpayactAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useSynchronizeBalances = () => {
  const { user } = useAuthContext();
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const synchronizeBalances = async () => {
    setIsSynchronizing(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await defpayactAPI.post(
        '/synchronize-balances',
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.status === 200) {
        setResult(response.data);
        return response.data;
      } else {
        throw new Error('Failed to synchronize balances');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Unexpected error';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSynchronizing(false);
    }
  };

  return { 
    synchronizeBalances, 
    isSynchronizing, 
    error, 
    result 
  };
}; 