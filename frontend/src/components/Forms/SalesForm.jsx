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
    const { name, value } = e.target;
    const raw = value.replace(/,/g, "");
    if (raw === "" || Number(raw) < 0) {
      setFormData({
        ...formData,
        sales: {
          ...formData.sales,
          [name]: "0",
        },
      });
    }
  };

  useEffect(() => {
    const creditSalesTotal = (creditSales || []).reduce((sum, d) => {
      return sum + parseFloat(d.amount || 0);
    }, 0);

    const creditBackTotal = (creditBack || []).reduce((sum, p) => {
      return sum + parseFloat(p.amount || 0);
    }, 0);

    setFormData({
      ...formData,
      sales: {
        ...formData.sales,
        creditSalesTotal: creditSalesTotal.toFixed(2),
        creditBackTotal: creditBackTotal.toFixed(2),
      },
    });
  }, [creditSales, creditBack]);

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-xl border border-gray-200">
      <CardContent className="p-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-10">
          Sales Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Cash with Manager (₹) *
            </Label>
            <Input
              type="text"
              name="cashWithManager"
              inputMode="decimal"
              value={formatCurrencyInput(formData.sales?.cashWithManager ?? "0")}
              onChange={handleChange}
              onBlur={handleBlur}
              className="bg-gray-50 border-gray-300 h-11"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              QR Transfer (₹) *
            </Label>
            <Input
              type="text"
              name="qrTransfer"
              inputMode="decimal"
              value={formatCurrencyInput(formData.sales?.qrTransfer ?? "0")}
              onChange={handleChange}
              onBlur={handleBlur}
              className="bg-gray-50 border-gray-300 h-11"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Card (₹) *
            </Label>
            <Input
              type="text"
              name="card"
              inputMode="decimal"
              value={formatCurrencyInput(formData.sales?.card ?? "0")}
              onChange={handleChange}
              onBlur={handleBlur}
              className="bg-gray-50 border-gray-300 h-11"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Cheques (₹) *
            </Label>
            <Input
              type="text"
              name="cheques"
              inputMode="decimal"
              value={formatCurrencyInput(formData.sales?.cheques ?? "0")}
              onChange={handleChange}
              onBlur={handleBlur}
              className="bg-gray-50 border-gray-300 h-11"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-red-700">
              Lost or Stolen Cash (₹) *
            </Label>
            <Input
              type="text"
              name="lost"
              inputMode="decimal"
              value={formatCurrencyInput(formData.sales?.lost ?? "0")}
              onChange={handleChange}
              onBlur={handleBlur}
              className="bg-gray-50 border-gray-300 h-11 border-red-200 focus:border-red-400 focus:ring-red-400"
            />
          </div>

          {/* Read-Only Totals */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Credit Sales Total (₹)
            </Label>
            <Input
              type="text"
              readOnly
              value={formatINR(formData.sales?.creditSalesTotal ?? "0")}
              className="bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed h-11"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Credit Back Total (₹)
            </Label>
            <Input
              type="text"
              readOnly
              value={formatINR(formData.sales?.creditBackTotal ?? "0")}
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
