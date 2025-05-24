// === /src/Hooks/ShiftHooks/useSubmitShift.js ===
import { useState } from "react";
import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useSubmitShift = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const { user } = useAuthContext();

  const submitShift = async ({ shift, creditSales = [], creditBack = [] }) => {
    setIsSubmitting(true);
    setError(null);
    setResponse(null);

    try {
      const res = await shiftAPI.post(
        "/submit",
        { shift, creditSales, creditBack },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      setResponse(res.data);
      return res.data;               // resolves on success
    } catch (err) {
      // Pass the backend message to the caller
      const msg =
        err.response?.data?.error ||
        "❌ Something went wrong submitting the shift.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsSubmitting(false);

      /* 🔽  LOG OUT ON *EVERY* EXIT  🔽 */
      localStorage.clear();          // remove token, user, any other keys
      window.location.href = "/login";   // hard-redirect to login
    }
  };

  return { submitShift, isSubmitting, error, response };
};
