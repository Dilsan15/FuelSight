
import shiftAPI from "@/APIs/shiftAPI";
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";
import { useState } from "react";

export const useAIUploadShift = () => {
  const { user } = useAuthContext();
  const [isUploadingAI, setIsUploadingAI] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");

  const uploadAI = async (files) => {
    if (!files || files.length === 0) {
      throw new Error("No file provided");
    }

    // Take only the first file if multiple are provided
    const file = files[0];
    
    setIsUploadingAI(true);
    setUploadProgress(0);

    try {

      
      // Send file to server for processing
      const formData = new FormData();
      
      // Add the single file to FormData
      formData.append('image', file);

      
      // Add user context
      formData.append('userId', user?._id);
      
      // Send to backend API
      const response = await shiftAPI.post('/ai-upload', formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          // Don't set Content-Type - let browser set it with boundary
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);

        }
      });


      return response.data;

    } catch (err) {

      throw err.response?.data || { error: "AI processing failed" };
    } finally {
      setIsUploadingAI(false);
      setUploadProgress(0);
      setCurrentFile("");
    }
  };

  return { 
    uploadAI,
    isUploadingAI, 
    uploadProgress, 
    currentFile 
  };
};
