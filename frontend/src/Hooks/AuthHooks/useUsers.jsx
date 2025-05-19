import { useState, useEffect } from 'react';
import userAPI from '@/APIs/userAPI';
import { useAuthContext } from './useAuthContext';

export const useUsers = (trigger = 0) => {
  const { user } = useAuthContext();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await userAPI.get('/all', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [trigger]); // react to external change

  return { users, isLoading, error };
};
