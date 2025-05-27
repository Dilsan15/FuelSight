import { useState, useEffect, useCallback, useRef } from "react";
import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useShifts = ({ start = null, end = null }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const { user } = useAuthContext();

  // ✅ Use ref to track current position to avoid stale closure
  const skipRef = useRef(0);

  const LIMIT = 20; // Fetch 20 shifts per request

  const fetchShifts = useCallback(async (reset = true) => {
    if (reset) {
    setLoading(true);
      setShifts([]);
      setHasMore(true);
      setError(null);
      skipRef.current = 0; // ✅ Reset skip position
    } else {
      setLoadingMore(true);
    }

    try {
      const params = {
        skip: skipRef.current,
        limit: LIMIT,
      };
      
      if (start) params.start = start;
      if (end) params.end = end;

      const res = await shiftAPI.get("/search", {
        params,
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      const newShifts = res.data.results || [];
      const totalCount = res.data.total || 0;

      setTotal(totalCount);

      if (reset) {
        setShifts(newShifts);
        skipRef.current = newShifts.length; // ✅ Set initial skip position
      } else {
        // ✅ Use functional update to avoid stale state and prevent duplicates
        setShifts(prev => {
          // ✅ Filter out any shifts that already exist (prevent duplicates)
          const existingIds = new Set(prev.map(shift => shift._id));
          const uniqueNewShifts = newShifts.filter(shift => !existingIds.has(shift._id));
          
          const combined = [...prev, ...uniqueNewShifts];
          skipRef.current = combined.length; // ✅ Update skip position
          return combined;
        });
      }

      // ✅ Use current skipRef value for hasMore calculation
      setHasMore(skipRef.current < totalCount && newShifts.length === LIMIT);

      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch shifts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [start, end, user?.token]); // ✅ Removed shifts.length from dependencies

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchShifts(false);
    }
  }, [fetchShifts, loadingMore, hasMore]);

  useEffect(() => {
    fetchShifts(true);
  }, [start, end, user?.token]);

  return { 
    shifts, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    total,
    fetchShifts: () => fetchShifts(true),
    loadMore
  };
};
