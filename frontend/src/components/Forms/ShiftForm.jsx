import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useSynchronizeReadings } from "@/Hooks/ShiftHooks/useSynchronizeReadings";
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";

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

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-xl border border-gray-200">
      <CardContent className="p-8 space-y-10">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Shift Details
        </h2>

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

        {/* Day Rates */}
        <section className="border border-gray-200 bg-white rounded-xl p-8 shadow-sm space-y-8">
          <h3 className="text-2xl font-bold text-gray-900">
            Applicable Day Rates (₹/L)
          </h3>
    
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {fuelTypes.map((fuel) => (
              <div key={fuel} className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">
                  {fuel} (₹/L) *
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
            ))}
          </div>
        </section>

        {/* Fuel Testing/Calibration */}
        <section className="border border-gray-200 bg-white rounded-xl p-8 shadow-sm space-y-8">
          <h3 className="text-2xl font-bold text-gray-900">
            Fuel Testing/Calibration
          </h3>
          {fuelTypes.map((fuel) => (
            <div
              key={fuel}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-gray-50 p-6 rounded-xl border border-gray-200"
            >
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">
                  Fuel Type *
                </Label>
                <Input
                  value={fuel}
                  readOnly
                  className="bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed h-11"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">
                  Quantity Used (L)
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
                  className="bg-gray-50 border-gray-300 h-11"
                />
              </div>
            </div>
          ))}
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
                {entries.map(({ nozzle, opening, closing }) => {
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
                            value={opening}
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
                            value={closing}
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
                              const openingVal = Number(opening) || 0;
                              const closingVal = Number(closing) || 0;
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
            onClick={onNext}
            className="h-11 px-6 bg-black text-white hover:bg-gray-800"
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftForm;
