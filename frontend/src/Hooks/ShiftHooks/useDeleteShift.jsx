import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";
import { useState } from "react";

export const useDeleteShift = () => {
  const { user } = useAuthContext();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteShift = async (shiftId) => {
    setIsDeleting(true);
    try {
      const res = await shiftAPI.delete(`/delete/${shiftId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      return res.data;
    } catch (err) {
      console.error("❌ Failed to delete shift:", err);
      throw err.response?.data || { error: "Unknown error" };
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteShift, isDeleting };
};
