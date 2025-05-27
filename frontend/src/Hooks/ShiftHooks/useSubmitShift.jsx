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
    // ✅ Prevent double submissions
    if (isSubmitting) {
      console.warn("⚠️ Submission already in progress, ignoring duplicate request");
      return null;
    }

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
      
      // ✅ Log out user after successful submission
      localStorage.clear();
      window.location.href = "/login";
      
      return res.data;
    } catch (err) {
      // Pass the backend message to the caller
      const errorData = err.response?.data;
      const msg = errorData?.error || "❌ Something went wrong submitting the shift.";
      const details = errorData?.details ? ` Details: ${errorData.details}` : "";
      const fullErrorMsg = msg + details;
      
      setError(fullErrorMsg);
      throw new Error(fullErrorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitShift, isSubmitting, error, response };
};
