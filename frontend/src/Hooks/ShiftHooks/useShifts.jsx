// /Hooks/ShiftHooks/usePaginatedShifts.js
import { useState, useEffect } from "react";
import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useShifts = ({
  page = 1,
  limit = 20,
  start = null,
  end = null,
}) => {
  const [shifts, setShifts] = useState([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuthContext();

  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true);
      try {
        const params = {
          skip: (page - 1) * limit,
          limit,
        };
        if (start) params.start = start;
        if (end) params.end = end;

        const res = await shiftAPI.get(
          "/search",
          { params, headers: {
              Authorization: `Bearer ${user?.token}`,
            },},

        );

        setShifts(res.data.results || []);
        setTotal(res.data.total || 0);
        setCount(res.data.count || 0);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch shifts");
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, [page, limit, start, end]);

  return { shifts, total, count, loading, error };
};
