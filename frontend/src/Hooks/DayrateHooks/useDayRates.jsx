import { useEffect, useState } from 'react';
import dayrateAPI from '@/APIs/dayrateAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useDayRates = () => {
  const {user} = useAuthContext()
  const [dayRates, setDayRates] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDayRates = async () => {
      try {
          
        
        const res = await dayrateAPI.get('/latest', {
          headers: {
            Authorization: `Bearer ${user.token}`,
  
          }
        });
        
        if (res.status === 200){
          setDayRates(res.data);
        }
        
      } catch (err) {
        setError(err.message || 'Failed to load day rates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDayRates();
  }, []);

  return { dayRates, isLoading, error };
};
