import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useSynchronizeReadings } from "@/Hooks/ShiftHooks/useSynchronizeReadings";
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";
import { useAIUploadShift } from "@/Hooks/ShiftHooks/useAIUploadShift";

import { formatINR } from "@/utils/formatting.js";
import {
  getSafePositive,
  getSafeDecimal,
  enforceZeroIfEmptyOrZero,
  enforceZeroIfEmpty,
  formatCurrencyInput,
} from "@/utils/handleSafeInput.js";

const ShiftForm = ({ formData = {}, setFormData, onNext, isLoading }) => {
  const { syncReadings, syncSingleNozzle, isLoading: isSyncing, syncingNozzles } = useSynchronizeReadings();
  const { user } = useAuthContext();
  const { uploadAI, isUploadingAI, uploadProgress, currentFile } = useAIUploadShift();
  const [uploadedImages, setUploadedImages] = useState([]);
  

  
  const fuelTypes = (formData.readings || [])
    .map((r) => r.fuelType)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  useEffect(() => {
    // Only update nozzleTesting if it's not properly initialized
    if (
      fuelTypes.length > 0 &&
      (!formData.nozzleTesting ||
      formData.nozzleTesting.length !== fuelTypes.length ||
      !fuelTypes.every(ft => formData.nozzleTesting.some(nt => nt.fuelType === ft)))
    ) {
      const preset = fuelTypes.map((fuelType) => ({ fuelType, quantity: "0" }));
      const updatedShift = { ...formData, nozzleTesting: preset };
      setFormData(updatedShift);
    }
  }, [fuelTypes.join(',')]); // Use join to avoid unnecessary re-renders when array order changes

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedShift = { ...formData, [name]: value };
    setFormData(updatedShift);
  };

  const handleReadingChange = (fuelType, nozzle, field, value) => {
    const updated = formData.readings.map((r) =>
      r.fuelType === fuelType && r.nozzle === nozzle
        ? { ...r, [field]: value } // Use the value as-is since it's already processed by getSafeDecimal
        : r
    );

    const updatedShift = { ...formData, readings: updated };
    setFormData(updatedShift);
  };

  const handleSyncReadings = async () => {
    try {
      const result = await syncReadings();
      
      if (result?.readings && result.readings.length > 0) {
        // Check if these are actual previous readings or just placeholder/default readings
        // If all readings have the same closing values (like 10, 10, 0), they're likely defaults
        const hasValidPreviousReadings = result.readings.some(r => 
          r.closing !== 10 && r.closing !== 0
        );
        
        if (hasValidPreviousReadings) {
          // Update the opening readings with the synced values
          const updatedReadings = formData.readings.map(reading => {
            const syncedReading = result.readings.find(
              r => r.fuelType === reading.fuelType && r.nozzle === reading.nozzle
            );
            if (syncedReading) {
              return {
                ...reading,
                opening: syncedReading.closing.toString()
              };
            }
            return reading;
          });
          const updatedShift = { ...formData, readings: updatedReadings };
          setFormData(updatedShift);
          console.log('✅ All readings synchronized successfully');
        } else {
          // These appear to be default/placeholder readings, default to 0
          const updatedReadings = formData.readings.map(reading => ({
            ...reading,
            opening: "0"
          }));
          const updatedShift = { ...formData, readings: updatedReadings };
          setFormData(updatedShift);
          console.log('ℹ️ Default readings detected, opening readings set to 0');
        }
      } else {
        // No previous shifts found, default all opening readings to 0
        const updatedReadings = formData.readings.map(reading => ({
          ...reading,
          opening: "0"
        }));
        const updatedShift = { ...formData, readings: updatedReadings };
        setFormData(updatedShift);
        console.log('ℹ️ No previous shifts found, opening readings set to 0');
      }
    } catch (error) {
      console.error('❌ Failed to sync readings:', error);
      alert('Failed to sync readings. Please try again.');
    }
  };

  const handleSyncSingleNozzle = async (fuelType, nozzle) => {
    try {
      const result = await syncSingleNozzle(fuelType, nozzle);
      if (result?.readings && result.readings.length > 0) {
        const syncedReading = result.readings[0];
        
        // Check if this is a valid previous reading or just a placeholder/default
        if (syncedReading.closing !== 10 && syncedReading.closing !== 0) {
          // Update only the specific nozzle reading
          const updatedReadings = formData.readings.map(reading => {
            if (reading.fuelType === fuelType && reading.nozzle === nozzle) {
              return {
                ...reading,
                opening: syncedReading.closing.toString()
              };
            }
            return reading;
          });
          const updatedShift = { ...formData, readings: updatedReadings };
          setFormData(updatedShift);
          console.log(`✅ ${fuelType} nozzle ${nozzle} synchronized successfully`);
        } else {
          // This appears to be a default/placeholder reading, default to 0
          const updatedReadings = formData.readings.map(reading => {
            if (reading.fuelType === fuelType && reading.nozzle === nozzle) {
              return {
                ...reading,
                opening: "0"
              };
            }
            return reading;
          });
          const updatedShift = { ...formData, readings: updatedReadings };
          setFormData(updatedShift);
          console.log(`ℹ️ Default reading detected for ${fuelType} nozzle ${nozzle}, opening set to 0`);
        }
      } else {
        // No previous reading found for this nozzle, default to 0
        const updatedReadings = formData.readings.map(reading => {
          if (reading.fuelType === fuelType && reading.nozzle === nozzle) {
            return {
              ...reading,
              opening: "0"
            };
          }
          return reading;
        });
        const updatedShift = { ...formData, readings: updatedReadings };
        setFormData(updatedShift);
        console.log(`ℹ️ No previous reading found for ${fuelType} nozzle ${nozzle}, opening set to 0`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync ${fuelType} nozzle ${nozzle}:`, error);
      alert(`Failed to sync ${fuelType} nozzle ${nozzle}. Please try again.`);
    }
  };

  const handleAIUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Only take the first file (single image mode)
    const file = files[0];
    
    // Store single image for later processing on submit
    setUploadedImages([file]);
  };

  const processAIImages = async () => {
    if (uploadedImages.length === 0) return;

    try {

      
      // Use server-side processing
      const result = await uploadAI(uploadedImages);
      
      if (result.success && result.extractedData) {

        
        // Merge the extracted data with existing form data
        const updatedFormData = { ...formData };
        
        // Update readings if found - fill existing boxes, don't create new ones
        if (result.extractedData.readings?.length > 0) {

          
          // Create a completely new array with updated readings
          const updatedReadings = (formData.readings || []).map(existingReading => {
            // Find matching AI reading for this existing reading
            const matchingAIReading = result.extractedData.readings.find(aiReading => {
              const fuelTypeMatch = existingReading.fuelType === aiReading.fuelType;
              const nozzleMatch = String(existingReading.nozzle) === String(aiReading.nozzle);
              

              
              return fuelTypeMatch && nozzleMatch;
            });
            
            if (matchingAIReading) {

              
              return {
                ...existingReading,
                opening: matchingAIReading.opening || existingReading.opening,
                closing: matchingAIReading.closing || existingReading.closing
              };
            }
            
            // No AI data found, return existing reading unchanged
            return existingReading;
          });
          

          updatedFormData.readings = updatedReadings;
        }
        

        
        // Update lube sales if found - create cards for AI extracted data
        if (result.extractedData.lubeSales?.length > 0) {

          
          const updatedLubeSales = [...(formData.lubeSales || [])];
          
          // For each AI-extracted lube sale, either update existing or create new
          result.extractedData.lubeSales.forEach((aiLube, index) => {
            if (index < updatedLubeSales.length) {
              // Update existing lube sale entry
              updatedLubeSales[index] = {
                description: aiLube.description || updatedLubeSales[index].description,
                amount: aiLube.amount || updatedLubeSales[index].amount,
                quantity: aiLube.quantity || updatedLubeSales[index].quantity
              };

            } else {
              // Create new lube sale entry
              updatedLubeSales.push({
                description: aiLube.description || "",
                amount: aiLube.amount || "",
                quantity: aiLube.quantity || "0"
              });

            }
          });
          

          updatedFormData.lubeSales = updatedLubeSales;
        }
        
        // Update nozzle testing if found - fill existing boxes, don't create new ones
        if (result.extractedData.nozzleTesting?.length > 0) {
          const updatedNozzleTesting = [...(formData.nozzleTesting || [])];
          
          // For each AI-extracted nozzle test, find and update the matching existing entry
          result.extractedData.nozzleTesting.forEach(aiTest => {
            const existingIndex = updatedNozzleTesting.findIndex(
              existing => existing.fuelType === aiTest.fuelType
            );
            
            if (existingIndex !== -1) {
              // Update existing nozzle testing entry
              updatedNozzleTesting[existingIndex] = {
                ...updatedNozzleTesting[existingIndex],
                quantity: aiTest.quantity || updatedNozzleTesting[existingIndex].quantity
              };

            } else {

            }
          });
          
          updatedFormData.nozzleTesting = updatedNozzleTesting;
        }
        
        // Apply the updated form data

        
        // Make sure we preserve the entire structure that setFormData expects
        setFormData(updatedFormData);
        

        
        // Clear uploaded images after processing
        setUploadedImages([]);
      }
      
    } catch (error) {

      throw error; // Re-throw to handle in onNext
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-xl border border-gray-200">
      <CardContent className="p-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Shift Details
          </h2>
          {/* Enhanced AI Image Upload Button with Dialog */}
          <div className="flex justify-center sm:justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  disabled={isUploadingAI}
                  className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold px-6 py-3 rounded-xl shadow-2xl hover:shadow-purple-500/25 hover:scale-105 transform transition-all duration-300 ease-in-out border-2 border-white/20 backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-1000 before:ease-in-out w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    ✨ AI Image Upload
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent 
                className="sm:max-w-[600px]" 
                onPointerDownOutside={(e) => isUploadingAI && e.preventDefault()} 
                onEscapeKeyDown={(e) => isUploadingAI && e.preventDefault()}
              >
                {/* Custom close button that can be disabled */}
                <button
                  className={`absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${isUploadingAI ? 'disabled:pointer-events-none opacity-30' : ''}`}
                  onClick={() => !isUploadingAI && document.querySelector('[data-dialog-close]')?.click()}
                  disabled={isUploadingAI}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
                
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl">
                    <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    ✨ AI Image Upload
                  </DialogTitle>
                  <DialogDescription>
                    {isUploadingAI 
                      ? "Please wait while AI processes your image. Do not close this dialog."
                      : "Upload an image of your shift readings and let AI automatically extract and fill in the data for you."
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* File Upload Area */}
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isUploadingAI ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-purple-400'}`}>
                    <div className="space-y-4">
                      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${isUploadingAI ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className={`text-lg font-medium ${isUploadingAI ? 'text-gray-500' : 'text-gray-900'}`}>
                          {isUploadingAI ? 'Processing image...' : 'Drop your image here'}
                        </p>
                        <p className={`text-sm ${isUploadingAI ? 'text-gray-400' : 'text-gray-500'}`}>
                          {isUploadingAI ? 'Please wait' : 'or click to browse image'}
                        </p>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAIUpload}
                          disabled={isUploadingAI}
                          className={isUploadingAI ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                      </div>
                      <p className={`text-xs ${isUploadingAI ? 'text-gray-300' : 'text-gray-400'}`}>
                        Supports JPG, PNG, GIF, WebP • Single image • Up to 10MB
                      </p>
                    </div>
                  </div>

                  {/* AI Processing Status */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <svg className={`w-4 h-4 text-white ${isUploadingAI ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        {isUploadingAI ? (
                          <>
                            <p className="font-medium text-gray-900">
                              Processing images... {uploadProgress}%
                            </p>
                            <p className="text-sm text-gray-600">
                              {currentFile ? `Current: ${currentFile}` : 'Extracting text from images'}
                            </p>
                            {uploadProgress > 0 && (
                              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            )}
                          </>
                        ) : uploadedImages.length > 0 ? (
                          <>
                            <p className="font-medium text-gray-900">
                              1 image ready for processing
                            </p>
                            <p className="text-sm text-gray-600">
                              Image will be processed when you click Next
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900">AI is ready to process your image</p>
                            <p className="text-sm text-gray-600">Upload an image and click Next to extract readings</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      disabled={isUploadingAI}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={processAIImages}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {isUploadingAI ? 'Processing...' : 'Submit'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        

        {/* Day Rates and Fuel Testing/Calibration */}
        <section className="border border-gray-200 bg-white rounded-xl p-8 shadow-sm space-y-8">
          <h3 className="text-2xl font-bold text-gray-900">
            Applicable Day Rates (₹/L) & Fuel Testing/Calibration
          </h3>
    
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {fuelTypes.map((fuel) => (
              <div key={fuel} className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">
                    {fuel} Day Rate (₹/L) *
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.dayRate?.[fuel] ?? ""}
                    onChange={(e) => {
                      const updatedShift = {
                        ...formData,
                        dayRate: {
                          ...formData.dayRate,
                          [fuel]: getSafeDecimal(e.target.value),
                        },
                      };
                      setFormData(updatedShift);
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || Number(e.target.value) < 0) {
                        const updatedShift = {
                          ...formData,
                          dayRate: {
                            ...formData.dayRate,
                            [fuel]: "0",
                          },
                        };
                        setFormData(updatedShift);
                      }
                    }}
                    className="bg-white border-gray-300 h-11"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">
                    {fuel} Testing Quantity (L)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={
                      formData.nozzleTesting?.find((f) => f.fuelType === fuel)
                        ?.quantity ?? ""
                    }
                    onChange={(e) => {
                      const updated = formData.nozzleTesting.map((entry) =>
                        entry.fuelType === fuel
                          ? {
                              ...entry,
                              quantity: getSafeDecimal(e.target.value),
                            }
                          : entry
                      );
                      const updatedShift = { ...formData, nozzleTesting: updated };
                      setFormData(updatedShift);
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || Number(e.target.value) < 0) {
                        const updated = formData.nozzleTesting.map((entry) =>
                          entry.fuelType === fuel
                            ? { ...entry, quantity: "0" }
                            : entry
                        );
                        const updatedShift = { ...formData, nozzleTesting: updated };
                        setFormData(updatedShift);
                      }
                    }}
                    className="bg-white border-gray-300 h-11"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shift Info */}
        <section className="border border-gray-200 bg-white rounded-xl p-8 shadow-sm space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">
                Worker Name *
              </Label>
              <Input
                name="submittedByName"
                value={formData.submittedByName || ""}
                onChange={(e) => {
                  const updatedShift = { ...formData, submittedByName: e.target.value };
                  setFormData(updatedShift);
                }}
                className="bg-gray-50 border-gray-300 h-11"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">
                Shift Date *
              </Label>
              <Input
                type="date"
                name="date"
                value={formData.date || ""}
                onChange={handleChange}
                className="bg-gray-50 border-gray-300 h-11"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">
                Shift Time *
              </Label>
              <Select
                value={formData.timeType || ""}
                onValueChange={(value) => {
                  const updatedShift = { ...formData, timeType: value };
                  setFormData(updatedShift);
                }}
              >
                <SelectTrigger className="bg-gray-50 border-gray-300 h-11">
                  <SelectValue placeholder="Select shift time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Fuel Readings */}
        <section className="border border-gray-200 bg-white rounded-xl p-8 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">Fuel Readings</h3>
            <Button
              variant="default"
              onClick={handleSyncReadings}
              disabled={isSyncing}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
            >
              {isSyncing ? "Syncing..." : "Sync All Readings"}
            </Button>
          </div>
          {fuelTypes.map((fuel) => {
            const entries = (formData.readings || []).filter(
              (r) => r.fuelType === fuel
            );
            return (
              <div key={fuel} className="space-y-6">
                <h4 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  {fuel} Nozzles
                </h4>
                {entries.map((reading) => {
                  const { nozzle, opening, closing } = reading;
                  const nozzleKey = `${fuel}-${nozzle}`;
                  const isSyncingThisNozzle = syncingNozzles.has(nozzleKey);
                  
                  return (
                    <div
                      key={`${fuel}-nozzle-${nozzle}`}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3"
                    >
                      {/* Header with nozzle name */}
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">
                          Nozzle {nozzle}
                        </span>
                      </div>
                      
                      {/* Opening reading with sync button */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-600 mb-1 block">
                            Opening (L) *
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={reading.opening || ""}
                            onChange={(e) =>
                              handleReadingChange(
                                fuel,
                                nozzle,
                                "opening",
                                getSafeDecimal(e.target.value)
                              )
                            }
                            onBlur={(e) => {
                              if (e.target.value === "") {
                                handleReadingChange(fuel, nozzle, "opening", "0");
                              }
                            }}
                            className="bg-white border-gray-300 text-gray-700 h-9 text-sm"
                            placeholder="Enter opening reading"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncSingleNozzle(fuel, nozzle)}
                          disabled={isSyncingThisNozzle || isSyncing}
                          className="h-9 px-3 text-xs mt-5"
                          title="Sync from previous shift"
                        >
                          {isSyncingThisNozzle ? "..." : "Sync"}
                        </Button>
                      </div>
                      
                      {/* Closing and Volume in a row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">
                            Closing (L) *
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={reading.closing || ""}
                            onChange={(e) =>
                              handleReadingChange(
                                fuel,
                                nozzle,
                                "closing",
                                getSafeDecimal(e.target.value)
                              )
                            }
                            onBlur={(e) => {
                              if (e.target.value === "") {
                                handleReadingChange(fuel, nozzle, "closing", "0");
                              }
                            }}
                            className="bg-white border-gray-300 h-9 text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">
                            Volume (L)
                          </Label>
                          <Input
                            type="number"
                            value={(() => {
                              const openingVal = Number(reading.opening) || 0;
                              const closingVal = Number(reading.closing) || 0;
                              const volumeSold = closingVal - openingVal;
                              // Only show decimals if the result is not a whole number
                              return volumeSold >= 0 ? 
                                (Number.isInteger(volumeSold) ? volumeSold.toString() : volumeSold.toFixed(2)) 
                                : "0";
                            })()}
                            readOnly
                            className="bg-green-50 border-green-200 text-green-700 h-9 text-sm font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>

        {/* Lube Sales */}
        <section className="border border-gray-200 bg-white rounded-xl p-8 shadow-sm space-y-8">
          <h3 className="text-2xl font-bold text-gray-900">Lube Sales</h3>
          {(formData.lubeSales || []).map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-gray-50 p-6 rounded-xl border border-gray-200"
            >
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">
                  Description
                </Label>
                <Input
                  value={item.description}
                  onChange={(e) => {
                    const updated = [...formData.lubeSales];
                    updated[index].description = e.target.value;
                    const updatedShift = { ...formData, lubeSales: updated };
                    setFormData(updatedShift);
                  }}
                  className="bg-gray-50 border-gray-300 h-11"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">
                  Amount (₹) *
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatCurrencyInput(item.amount || "")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    const updated = [...formData.lubeSales];
                    updated[index].amount = getSafeDecimal(raw);
                    const updatedShift = { ...formData, lubeSales: updated };
                    setFormData(updatedShift);
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                                          const updated = [...formData.lubeSales];
                      if (raw === "" || Number(raw) < 0) {
                        updated[index].amount = "0";
                        const updatedShift = { ...formData, lubeSales: updated };
                        setFormData(updatedShift);
                      }
                  }}
                  className="bg-gray-50 border-gray-300 h-11"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">
                  Quantity (L) *
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={item.quantity || ""}
                  onChange={(e) => {
                    const updated = [...formData.lubeSales];
                    updated[index].quantity = getSafeDecimal(e.target.value);
                    const updatedShift = { ...formData, lubeSales: updated };
                    setFormData(updatedShift);
                  }}
                  onBlur={(e) => {
                                          if (e.target.value === "" || Number(e.target.value) < 0) {
                        const updated = [...formData.lubeSales];
                        updated[index].quantity = "0";
                        const updatedShift = { ...formData, lubeSales: updated };
                        setFormData(updatedShift);
                      }
                  }}
                  className="bg-gray-50 border-gray-300 h-11"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="destructive"
                  onClick={() => {
                    const updated = formData.lubeSales.filter(
                      (_, i) => i !== index
                    );
                    const updatedShift = { ...formData, lubeSales: updated };
                    setFormData(updatedShift);
                  }}
                  className="h-11 px-6"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                const updated = [
                  ...(formData.lubeSales || []),
                  { description: "", amount: "", quantity: "0" },
                ];
                
                const updatedShift = { ...formData, lubeSales: updated };
                setFormData(updatedShift);
              }}
              className="h-11 px-6"
            >
              Add Lube Sale
            </Button>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <Button
            type="button"
            onClick={async () => {
              try {
                // Process AI images first if any are uploaded
                if (uploadedImages.length > 0) {
                  await processAIImages();
                }
                // Then proceed to next step
                onNext();
              } catch (error) {
                alert(`AI processing failed: ${error.error || error.message || 'Unknown error'}`);
              }
            }}
            disabled={isLoading || isUploadingAI}
            className="h-11 px-6 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingAI ? 'Processing AI Images...' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftForm;
