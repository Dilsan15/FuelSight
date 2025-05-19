
import defPayAPI from '@/APIs/defpayactAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';
import { useState, useEffect } from 'react';

export const useDefPayAct = (id) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const {user} = useAuthContext()

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await defPayAPI.get(`/${id}`, {
            headers:{
                'Authorization' : `bearer ${user.token}`
            }
        });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load account');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAccount();
  }, [id]);

  return { data, loading, error };
};
