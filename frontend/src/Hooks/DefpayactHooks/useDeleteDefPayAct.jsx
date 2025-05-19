import defPayAPI from '@/APIs/defpayactAPI';

export const useDeleteDefPayAct = () => {
  const deleteAccount = async (id) => {
    try {
      const res = await defPayAPI.delete(`/${id}`,{
        headers: {
          Authorization: token ? `Bearer ${user.token}` : undefined
        }}
      );
      return res.data;
    } catch (err) {
      console.error('Delete failed:', err);
      throw err.response?.data || { error: 'Unknown error' };
    }
  };

  return { deleteAccount };
};
