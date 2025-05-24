import { useState, useEffect, useCallback } from "react";
import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useShifts = ({ start = null, end = null }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuthContext();

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;

      const res = await shiftAPI.get("/search", {
        params,
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      setShifts(res.data.results || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch shifts");
    } finally {
      setLoading(false);
    }
  }, [start, end, user?.token]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  return { shifts, loading, error, fetchShifts };
};
