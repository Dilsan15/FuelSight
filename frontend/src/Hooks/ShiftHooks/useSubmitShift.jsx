// === /src/Hooks/ShiftHooks/useSubmitShift.js ===
import { useState } from "react";
import axios from "@/APIs/shiftAPI"; // assumes centralized axios instance is already configured
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useSubmitShift = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const {user} = useAuthContext()

  const submitShift = async ({ shift, deferals = [], payments = [], token }) => {
    setIsSubmitting(true);
    setError(null);
    setResponse(null);

    try {
      const res = await axios.post(
        "/submit",
        {
          shift,
          deferals,
          payments
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );

      setResponse(res.data);
      return res.data;
    } catch (err) {
      const msg =
        err.response?.data?.error || "❌ Something went wrong submitting the shift.";
      setError(msg);
      throw new Error(msg); // optional: rethrow to handle it outside
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitShift,
    isSubmitting,
    error,
    response
  };
};
