import { useState, useEffect } from "react";
import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useShifts = ({ start = null, end = null }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuthContext();

  useEffect(() => {
    const fetchShifts = async () => {
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
    };

    fetchShifts();
  }, [start, end]);

  return { shifts, loading, error };
};
