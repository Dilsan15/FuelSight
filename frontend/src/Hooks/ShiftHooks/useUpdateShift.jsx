import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "../AuthHooks/useAuthContext";

export const useUpdateShift = () => {
  const { user } = useAuthContext();

  const updateShift = async (id, data) => {
    const res = await shiftAPI.patch(`/update/${id}`, data, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    return res.data;
  };

  return { updateShift };
};
