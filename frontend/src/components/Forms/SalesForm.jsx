import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SalesForm = ({
  formData,
  setFormData,
  onNext,
  onBack,
  deferals,
  payments,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      sales: {
        ...formData.sales,
        [name]: value,
      },
    });
  };

  useEffect(() => {
    const deferralTotal = (deferals || []).reduce((sum, d) => {
      const litres = parseFloat(d.litres || 0);
      const rate = parseFloat(formData.dayRate?.[d.fuelType] || 0);
      return sum + litres * rate;
    }, 0);

    const advancePaymentTotal = (payments || []).reduce((sum, p) => {
      return sum + parseFloat(p.amount || 0);
    }, 0);

    setFormData({
      ...formData,
      sales: {
        ...formData.sales,
        deferralTotal: deferralTotal.toFixed(2),
        advancePaymentTotal: advancePaymentTotal.toFixed(2),
      },
    });
  }, [deferals, payments, formData.dayRate]);

  return (
    <Card className="p-6 space-y-6 bg-gradient-to-br from-[#fefefe] to-[#f5f5f5] border border-gray-300 shadow-xl rounded-xl">
      <CardContent className="space-y-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Sales Summary (₹)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              Cash with Manager *
            </Label>
            <Input
              type="number"
              name="cashWithManager"
              value={formData.sales?.cashWithManager ?? ""}
              onChange={handleChange}
              
              className="bg-gray-50 border-gray-300"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              QR Transfer Payments Total *
            </Label>
            <Input
              type="number"
              name="qrTransfer"
              value={formData.sales?.qrTransfer ?? ""}
              onChange={handleChange}
              className="bg-gray-50 border-gray-300"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              Card Payments Total *
            </Label>
            <Input
              type="number"
              name="card"
              value={formData.sales?.card ?? ""}
              onChange={handleChange}
              className="bg-gray-50 border-gray-300"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-red-700">
              Lost or Stolen Cash *
            </Label>
            <Input
              type="number"
              name="lost"
              value={formData.sales?.lost ?? ""}
              onChange={handleChange}
              className="bg-gray-50 border-gray-300"
            />
          </div>

          {/* Read-Only Totals */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              Deferral Amount Total
            </Label>
            <Input
              type="number"
              name="deferralTotal"
              value={formData.sales?.deferralTotal ?? ""}
              readOnly
              className="bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              Advance Payment Total
            </Label>
            <Input
              type="number"
              name="advancePaymentTotal"
              value={formData.sales?.advancePaymentTotal ?? ""}
              readOnly
              className="bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            className="bg-black text-white hover:bg-gray-800"
            onClick={onNext}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesForm;
