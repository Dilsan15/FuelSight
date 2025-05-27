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

import { formatINR } from "@/utils/formatting.js";
import {
  getSafePositive,
  getSafeDecimal,
  enforceZeroIfEmptyOrZero,
  enforceZeroIfEmpty,
  formatCurrencyInput,
} from "@/utils/handleSafeInput.js";

const ShiftForm = ({ formData = {}, setFormData, onNext, isLoading }) => {
  const fuelTypes = (formData.readings || [])
    .map((r) => r.fuelType)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  useEffect(() => {
    if (
      !formData.nozzleTesting ||
      formData.nozzleTesting.length !== fuelTypes.length
    ) {
      const preset = fuelTypes.map((fuelType) => ({ fuelType, quantity: "0" }));
      setFormData({ nozzleTesting: preset });
    }
  }, [fuelTypes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const deleteReading = (fuelType, nozzle) => {
    const updated = formData.readings.filter(
      (r) => !(r.fuelType === fuelType && r.nozzle === nozzle)
    );
    setFormData({ readings: updated });
  };

  const handleReadingChange = (fuelType, nozzle, field, value) => {
    const updated = formData.readings.map((r) =>
      r.fuelType === fuelType && r.nozzle === nozzle
        ? { ...r, [field]: getSafePositive(value) }
        : r
    );
    setFormData({ readings: updated });
  };

  const addReading = (fuelType) => {
    const maxNozzle = Math.max(
      0,
      ...formData.readings
        .filter((r) => r.fuelType === fuelType)
        .map((r) => r.nozzle || 0)
    );
    const newNozzle = maxNozzle + 1;
    const newReading = {
      fuelType,
      nozzle: newNozzle,
      opening: "",
      closing: "",
    };
    setFormData({
      readings: [...(formData.readings || []), newReading],
    });
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
                onChange={(e) =>
                  setFormData({ submittedByName: e.target.value })
                }
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
                onValueChange={(value) => setFormData({ timeType: value })}
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
                  {fuel} (₹/L)
                </Label>
                <Input
                  value={formData.dayRate?.[fuel] ?? "N/A"}
                  readOnly
                  className="bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed h-11"
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
                    setFormData({ nozzleTesting: updated });
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "" || Number(e.target.value) < 0) {
                      const updated = formData.nozzleTesting.map((entry) =>
                        entry.fuelType === fuel
                          ? { ...entry, quantity: "0" }
                          : entry
                      );
                      setFormData({ nozzleTesting: updated });
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
          <h3 className="text-2xl font-bold text-gray-900">Fuel Readings</h3>
          {fuelTypes.map((fuel) => {
            const entries = (formData.readings || []).filter(
              (r) => r.fuelType === fuel
            );
            return (
              <div key={fuel} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-semibold text-gray-800">
                    {fuel} Nozzles
                  </h4>
                  <Button
                    variant="outline"
                    onClick={() => addReading(fuel)}
                    className="h-11 px-6"
                  >
                    Add {fuel} Nozzle
                  </Button>
                </div>
                {entries.map(({ nozzle, opening, closing }) => (
                  <div
                    key={`${fuel}-nozzle-${nozzle}`}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-gray-50 p-6 rounded-xl border border-gray-200"
                  >
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">
                        Opening - Nozzle {nozzle} (L)
                      </Label>
                      <Input
                        type="number"
                        value={opening}
                        readOnly
                        className="bg-gray-100 border-gray-300 text-gray-600 h-11"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">
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
                        className="bg-gray-50 border-gray-300 h-11"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="destructive"
                        onClick={() => deleteReading(fuel, nozzle)}
                        className="h-11 px-6"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
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
                    setFormData({ lubeSales: updated });
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
                    setFormData({ lubeSales: updated });
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    const updated = [...formData.lubeSales];
                    if (raw === "" || Number(raw) < 0) {
                      updated[index].amount = "0";
                      setFormData({ lubeSales: updated });
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
                    setFormData({ lubeSales: updated });
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "" || Number(e.target.value) < 0) {
                      const updated = [...formData.lubeSales];
                      updated[index].quantity = "0";
                      setFormData({ lubeSales: updated });
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
                    setFormData({ lubeSales: updated });
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
                setFormData({ lubeSales: updated });
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
