import { useState } from 'react';
import shiftAPI from '@/APIs/shiftAPI';
import { useAuthContext } from '../AuthHooks/useAuthContext';

export const useSynchronizeReadings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncingNozzles, setSyncingNozzles] = useState(new Set());
  const { user } = useAuthContext();

  const syncReadings = async (userId = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = userId ? `/synchronize-readings/${userId}` : '/synchronize-readings';
      
      const response = await shiftAPI.post(endpoint, {}, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      console.log('✅ Readings synchronized successfully:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to synchronize readings';
      console.log('🔍 Debug - Error message received:', errorMessage);
      
      // Handle "No shifts found" as a successful case, not an error
      if (errorMessage.toLowerCase().includes('no shifts found') || 
          errorMessage.toLowerCase().includes('no readings in latest shift') ||
          errorMessage.toLowerCase().includes('no shifts found for user')) {
        console.log('ℹ️ No previous shifts found, will default to 0');
        return { readings: [] }; // Return empty readings array instead of throwing error
      }
      
      console.error('❌ Error synchronizing readings:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const syncSingleNozzle = async (fuelType, nozzle, userId = null) => {
    const nozzleKey = `${fuelType}-${nozzle}`;
    setSyncingNozzles(prev => new Set([...prev, nozzleKey]));
    setError(null);

    try {
      const endpoint = userId ? `/synchronize-readings/${userId}` : '/synchronize-readings';
      
      const response = await shiftAPI.post(endpoint, {}, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      console.log(`✅ Nozzle ${nozzle} (${fuelType}) synchronized successfully`);
      
      // Filter the response to only return the specific nozzle data
      if (response.data?.readings) {
        const specificReading = response.data.readings.find(
          r => r.fuelType === fuelType && r.nozzle === nozzle
        );
        return {
          ...response.data,
          readings: specificReading ? [specificReading] : []
        };
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || `Failed to synchronize ${fuelType} nozzle ${nozzle}`;
      console.log(`🔍 Debug - Error message for ${fuelType} nozzle ${nozzle}:`, errorMessage);
      
      // Handle "No shifts found" as a successful case, not an error
      if (errorMessage.toLowerCase().includes('no shifts found') || 
          errorMessage.toLowerCase().includes('no readings in latest shift') ||
          errorMessage.toLowerCase().includes('no shifts found for user')) {
        console.log(`ℹ️ No previous reading found for ${fuelType} nozzle ${nozzle}, will default to 0`);
        return { readings: [] }; // Return empty readings array instead of throwing error
      }
      
      console.error(`❌ Error synchronizing ${fuelType} nozzle ${nozzle}:`, errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setSyncingNozzles(prev => {
        const newSet = new Set(prev);
        newSet.delete(nozzleKey);
        return newSet;
      });
    }
  };

  return {
    syncReadings,
    syncSingleNozzle,
    isLoading,
    syncingNozzles,
    error
  };
}; 