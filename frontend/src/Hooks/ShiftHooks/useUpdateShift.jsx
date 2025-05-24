import { useState } from "react";
import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useUpdateShift = () => {
  const { user } = useAuthContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const updateShift = async (id, data) => {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await shiftAPI.patch(`/update/${id}`, data, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      return res.data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to update shift";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateShift, isUpdating, error };
};
