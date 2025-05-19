import { useState } from 'react';
import userAPI from '@/APIs/userAPI';
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

export const useEditUser = () => {
  const { user } = useAuthContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const editUser = async (userId, updates) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await userAPI.put(`/${userId}`, updates, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.status === 200) {
        return response.data; // updated user object
      } else {
        throw new Error('Failed to update user');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return { editUser, isUpdating, error };
};
