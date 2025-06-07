import { useState } from 'react';
import defpayactAPI from '@/APIs/defpayactAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useSynchronizeBalance = () => {
  const { user } = useAuthContext();
  const [synchronizingAccounts, setSynchronizingAccounts] = useState(new Set());
  const [error, setError] = useState(null);

  const synchronizeBalance = async (accountId) => {
    setSynchronizingAccounts(prev => new Set([...prev, accountId]));
    setError(null);
    
    try {
      const response = await defpayactAPI.post(
        `/synchronize-balance/${accountId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error('Failed to synchronize balance');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Unexpected error';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setSynchronizingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  const isSynchronizing = (accountId) => synchronizingAccounts.has(accountId);

  return { 
    synchronizeBalance, 
    isSynchronizing, 
    error 
  };
}; 