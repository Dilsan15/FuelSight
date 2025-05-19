import { useState } from 'react';
import userAPI from '@/APIs/userAPI'; 
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

export const useCreateUser = () => {
  const { user } = useAuthContext(); // For auth token
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);

  const createUser = async (userData) => {
    setIsCreating(true);
    setError(null);
    setCreatedUser(null);

    try {
      const response = await userAPI.post('/signup', userData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (response.status === 200 || response.status === 201) {
        setCreatedUser(response.data);
        return response.data;
      } else {
        throw new Error('Failed to create user');
      }
    } catch (err) {
      const message =
        err.response?.data?.error || err.message || 'User creation failed';
      setError(message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createUser, isCreating, error, createdUser };
};
