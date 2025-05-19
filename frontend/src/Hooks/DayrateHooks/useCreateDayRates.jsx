import { useState } from 'react';
import dayrateAPI from '@/APIs/dayrateAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useCreateDayRate = () => {
  const { user } = useAuthContext();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const createDayRate = async (newRates) => {
    setIsCreating(true);
    try {
      const response = await dayrateAPI.post(
        '/create',
        { rates: newRates },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        return true;
      } else {
        throw new Error('Failed to create day rate entry');
      }
    } catch (err) {
      setError(err.message || 'Unexpected error');
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  return { createDayRate, isCreating, error };
};
