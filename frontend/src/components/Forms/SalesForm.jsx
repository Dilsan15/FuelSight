import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/utils/formatting"; // 💰 Formatter
import {
  getSafePositive,
  getSafeDecimal,
  enforceZeroIfEmpty,
  formatCurrencyInput,
} from "@/utils/handleSafeInput";

const SalesForm = ({
  formData,
  setFormData,
  onNext,
  onBack,
  creditSales,
  creditBack,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    const raw = value.replace(/,/g, "");
    setFormData({
      ...formData,
      sales: {
        ...formData.sales,
        [name]: getSafeDecimal(raw),
      },
    });
  };

  const handleBlur = (e) => {
    // Don't force any values - let them stay empty if user wants
  };

  // Calculate totals directly from props
  const creditSalesTotal = (creditSales || []).reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  const creditBackTotal = (creditBack || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-xl border border-gray-200">
      <CardContent className="p-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-10">
          Sales Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column: Main payment inputs */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-gray-700">
              Cash with Manager (₹) *
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              name="cashWithManager"
              value={formatCurrencyInput(formData.sales?.cashWithManager || "")}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter amount"
              className="bg-gray-50 border-gray-300 h-11"
            />

            <Label className="text-sm font-semibold text-gray-700">
              QR Transfer (₹) *
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              name="qrTransfer"
              value={formatCurrencyInput(formData.sales?.qrTransfer || "")}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter amount"
              className="bg-gray-50 border-gray-300 h-11"
            />

            <Label className="text-sm font-semibold text-gray-700">
              Card (₹) *
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              name="card"
              value={formatCurrencyInput(formData.sales?.card || "")}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter amount"
              className="bg-gray-50 border-gray-300 h-11"
            />

            <Label className="text-sm font-semibold text-gray-700">
              Cheques (₹) *
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              name="cheques"
              value={formatCurrencyInput(formData.sales?.cheques || "")}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter amount"
              className="bg-gray-50 border-gray-300 h-11"
            />
          </div>

          {/* Right column: Lost/Stolen, Deferral, Payment */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-red-700">
              Lost or Stolen Cash (₹) *
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              name="lost"
              value={formatCurrencyInput(formData.sales?.lost || "")}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter amount"
              className="bg-gray-50 border-gray-300 h-11 border-red-200 focus:border-red-400 focus:ring-red-400"
            />

            <Label className="text-sm font-semibold text-gray-700">
              Credit Sales Total (₹)
            </Label>
            <Input
              type="text"
              readOnly
              value={formatINR(creditSalesTotal)}
              className="bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed h-11"
            />

            <Label className="text-sm font-semibold text-gray-700">
              Credit Back Total (₹)
            </Label>
            <Input
              type="text"
              readOnly
              value={formatINR(creditBackTotal)}
              className="bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed h-11"
            />
          </div>
        </div>

        <div className="pt-10 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-11 px-6"
          >
            Back
          </Button>
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

export default SalesForm;
