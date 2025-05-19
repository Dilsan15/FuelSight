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

const ShiftForm = ({ formData = {}, setFormData, onNext, isLoading }) => {
  const fuelTypes = (formData.readings || [])
    .map((r) => r.fuelType)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  useEffect(() => {
    if (
      !formData.thrownOutFuel ||
      formData.thrownOutFuel.length !== fuelTypes.length
    ) {
      const preset = fuelTypes.map((fuelType) => ({ fuelType, quantity: "0" }));
      setFormData({ thrownOutFuel: preset });
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
        ? { ...r, [field]: value }
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
    <Card className="p-6 space-y-6 bg-gradient-to-br from-[#fefefe] to-[#f5f5f5] border border-gray-300 shadow-xl rounded-xl">
      <CardContent className="space-y-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Shift Details
        </h2>

        {/* Shift Info */}
        <section className="border border-gray-200 bg-white rounded-lg p-6 shadow-md space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                Worker Name * 
              </Label>
              <Input
                name="submittedByName"
                value={formData.submittedByName || ""}
                onChange={(e) =>
                  setFormData({ submittedByName: e.target.value })
                }
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                Shift Date *
              </Label>
              <Input
                type="date"
                name="date"
                value={formData.date || ""}
                onChange={handleChange}
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                Shift Time *
              </Label>
              <Select
                value={formData.timeType || ""}
                onValueChange={(value) => setFormData({ timeType: value })}
              >
                <SelectTrigger className="bg-gray-50 border border-gray-300">
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
        <section className="border border-gray-200 bg-white rounded-lg p-6 shadow-md space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Applicable Day Rates (₹ per Litre)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...new Set((formData.readings || []).map((r) => r.fuelType))].map(
              (fuel) => (
                <div key={fuel}>
                  <Label className="text-sm font-semibold text-gray-700">
                    {fuel}
                  </Label>
                  <Input
                    value={formData.dayRate?.[fuel] ?? "N/A"}
                    readOnly
                    className="bg-gray-100 border border-gray-300 text-gray-600 cursor-not-allowed"
                  />
                </div>
              )
            )}
          </div>
        </section>

        {/* Thrown Out Fuel */}
        <section className="border border-gray-200 bg-white rounded-lg p-6 shadow-md space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Fuel Thrown Out (Calibration) *
          </h3>
          {fuelTypes.map((fuel) => (
            <div
              key={fuel}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-100 p-4 rounded-md"
            >
              <div>
                <Label>Fuel Type *</Label>
                <Input
                  value={fuel}
                  readOnly
                  className="bg-gray-100 border border-gray-300 text-gray-600 cursor-not-allowed"
                />
              </div>
              <div>
                <Label>Quantity Thrown (L)</Label>
                <Input
                  type="number"
                  value={
                    formData.thrownOutFuel?.find((f) => f.fuelType === fuel)
                      ?.quantity ?? ""
                  }
                  onChange={(e) => {
                    const updated = formData.thrownOutFuel.map((entry) =>
                      entry.fuelType === fuel
                        ? { ...entry, quantity: e.target.value }
                        : entry
                    );
                    setFormData({ thrownOutFuel: updated });
                  }}
                  min={0}
                  className="bg-gray-50 border-gray-300"
                />
              </div>
            </div>
          ))}
        </section>

        {/* Fuel Readings */}
        <section className="border border-gray-200 bg-white rounded-lg p-6 shadow-md space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Fuel Readings</h3>
          {fuelTypes.map((fuel) => {
            const entries = (formData.readings || []).filter(
              (r) => r.fuelType === fuel
            );
            return (
              <div key={fuel} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">{fuel} Nozzles</h4>
                  <Button variant="outline" onClick={() => addReading(fuel)}>
                    Add {fuel} Nozzle
                  </Button>
                </div>
                {entries.map(({ nozzle, opening, closing }) => (
                  <div
                    key={`${fuel}-nozzle-${nozzle}`}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-100 p-4 rounded-md"
                  >
                    <div>
                      <Label>Opening - Nozzle {nozzle}</Label>
                      <Input
                        type="number"
                        value={opening}
                        readOnly
                        className="bg-gray-100 border border-gray-300 text-gray-600"
                      />
                    </div>
                    <div>
                      <Label>Closing *</Label>
                      <Input
                        type="number"
                        value={closing}
                        onChange={(e) =>
                          handleReadingChange(
                            fuel,
                            nozzle,
                            "closing",
                            e.target.value
                          )
                        }
                        min={0}
                        className="bg-gray-50 border-gray-300"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="destructive"
                        onClick={() => deleteReading(fuel, nozzle)}
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
        <section className="border border-gray-200 bg-white rounded-lg p-6 shadow-md space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Lube Sales</h3>
          {(formData.lubeSales || []).map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gray-100 p-4 rounded-md"
            >
              <div>
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => {
                    const updated = [...formData.lubeSales];
                    updated[index].description = e.target.value;
                    setFormData({ lubeSales: updated });
                  }}
                  className="bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={item.amount}
                  onChange={(e) => {
                    const updated = [...formData.lubeSales];
                    updated[index].amount = e.target.value;
                    setFormData({ lubeSales: updated });
                  }}
                  className="bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <Label>Quantity (L) *</Label>
                <Input
                  type="number"
                  value={item.quantity || ""}
                  onChange={(e) => {
                    const updated = [...formData.lubeSales];
                    updated[index].quantity = e.target.value;
                    setFormData({ lubeSales: updated });
                  }}
                  className="bg-gray-50 border-gray-300"
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
                  { description: "", amount: "", quantity: 1 },
                ];
                setFormData({ lubeSales: updated });
              }}
            >
              Add Lube Sale
            </Button>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <Button type="button" onClick={onNext}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftForm;
