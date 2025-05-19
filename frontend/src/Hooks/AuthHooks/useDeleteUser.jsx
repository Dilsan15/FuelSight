import { useState } from 'react';
import userAPI from '@/APIs/userAPI';
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext';

export const useDeleteUser = () => {
  const { user } = useAuthContext();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const deleteUser = async (userId) => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await userAPI.delete(`/${userId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.status === 200) {
        return true;
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteUser, isDeleting, error };
};
