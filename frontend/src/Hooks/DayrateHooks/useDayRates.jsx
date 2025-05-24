import { useEffect, useState } from "react";
import dayrateAPI from "@/APIs/dayrateAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useDayRates = () => {
  const { user } = useAuthContext();
  const [dayRates, setDayRates] = useState(null);
  const [rateHistory, setRateHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch latest rates
        const latestRes = await dayrateAPI.get("/latest", {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        });

        // Fetch rate history
        const historyRes = await dayrateAPI.get("/search", {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
          params: {
            limit: 50,
            skip: 0,
          },
        });

        if (latestRes.status === 200) {
          setDayRates({
            ...latestRes.data,
            history: historyRes.data.results || [],
          });
          setRateHistory(historyRes.data.results || []);
        }
      } catch (err) {
        console.error("Error fetching day rates:", err);
        setError(err.message || "Failed to load day rates");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const refreshRates = async () => {
    setIsLoading(true);
    try {
      const latestRes = await dayrateAPI.get("/latest", {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      const historyRes = await dayrateAPI.get("/search", {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        params: {
          limit: 50,
          skip: 0,
        },
      });

      if (latestRes.status === 200) {
        setDayRates({
          ...latestRes.data,
          history: historyRes.data.results || [],
        });
        setRateHistory(historyRes.data.results || []);
      }
    } catch (err) {
      console.error("Error refreshing day rates:", err);
      setError(err.message || "Failed to refresh day rates");
    } finally {
      setIsLoading(false);
    }
  };

  return { dayRates, rateHistory, isLoading, error, refreshRates };
};
