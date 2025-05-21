import { useState } from "react";
import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useGetShift = () => {
  const { user } = useAuthContext();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchShift = async (id) => {
    setLoading(true);
    try {
      const res = await shiftAPI.get(`/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setShift(res.data);
    } catch (err) {
      setError("Failed to fetch shift");
    } finally {
      setLoading(false);
    }
  };

  return { shift, loading, error, fetchShift };
};
