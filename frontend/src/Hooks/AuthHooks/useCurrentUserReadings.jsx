import { useState } from 'react';
import userAPI from '@/APIs/userAPI';
import { useAuthContext } from './useAuthContext';

export const useCurrentUserReadings = () => {
  const [readings, setReadings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuthContext();

  const fetchReadings = async () => {
    if (!user?.token) {
      setError('No authentication token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await userAPI.get('/my-readings', {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      setReadings(response.data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch readings';
      setError(errorMsg);
      console.error('❌ Error fetching user readings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { readings, isLoading, error, fetchReadings };
}; 