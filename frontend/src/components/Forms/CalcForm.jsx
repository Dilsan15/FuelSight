import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/utils/formatting";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const CalcForm = ({ formData, setFormData, onBack, onNext }) => {
  const { shift = {}, creditBack = [], creditSales = [] } = formData;
  const {
    readings = [],
    nozzleTesting = [],
    lubeSales = [],
    sales = {},
    dayRate = {},
  } = shift;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const groupedReadings = readings.reduce((acc, curr) => {
    if (!acc[curr.fuelType]) acc[curr.fuelType] = [];
    acc[curr.fuelType].push(curr);
    return acc;
  }, {});

  const nozzleTestingMap = nozzleTesting.reduce((acc, entry) => {
    acc[entry.fuelType] = parseFloat(entry.quantity || 0);
    return acc;
  }, {});

  let totalFuelRevenue = 0;
  let totalCalibrationRevenue = 0;
  const fuelRevenueBreakdown = Object.entries(groupedReadings).map(
    ([fuelType, entries]) => {
      const rate = parseFloat(dayRate[fuelType] || 0);
      const totalVolume = entries.reduce((sum, reading) => {
        const opening = parseFloat(reading.opening || 0);
        const closing = parseFloat(reading.closing || 0);
        return sum + (closing - opening);
      }, 0);

      const nozzleTest = nozzleTestingMap[fuelType] || 0;
      const netVolume = totalVolume - nozzleTest;
      const revenue = netVolume * rate;
      const calibrationRevenue = nozzleTest * rate;

      totalFuelRevenue += revenue;
      totalCalibrationRevenue += calibrationRevenue;

      return (
        <div
          key={fuelType}
          className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
        >
          <h4 className="font-semibold text-lg text-gray-800">{fuelType}</h4>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="text-sm text-gray-600">Total Volume</div>
              <div className="font-medium text-gray-800">
                {totalVolume.toFixed(2)} L
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Nozzle Testing</div>
              <div className="font-medium text-gray-800">
                {nozzleTest.toFixed(2)} L
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Net Volume</div>
              <div className="font-medium text-gray-800">
                {netVolume.toFixed(2)} L
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Rate</div>
              <div className="font-medium text-gray-800">
                ₹{rate.toFixed(2)}/L
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-600">Revenue</div>
              <div className="font-semibold text-lg text-blue-600">
                ₹{formatINR(revenue.toFixed(2))}
              </div>
            </div>
          </div>
        </div>
      );
    }
  );

  const totalLubeSales = lubeSales.reduce(
    (sum, sale) => sum + parseFloat(sale.amount || 0),
    0
  );
  const totalCreditSales = creditSales.reduce(
    (sum, d) => sum + parseFloat(d.amount || 0),
    0
  );
  const totalCreditBack = creditBack.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0
  );

  const qrTransfer = parseFloat(sales.qrTransfer || 0);
  const card = parseFloat(sales.card || 0);
  const cheques = parseFloat(sales.cheques || 0);
  const managerCash = parseFloat(sales.cashWithManager || 0);
  const lost = parseFloat(sales.lost || 0);

  // TTS = Fuel Revenue + Lube Sales + Credit Back (Total Theoretical Sale)
  // Note: totalFuelRevenue already accounts for calibration cost reduction
  const TTS = totalFuelRevenue + totalLubeSales + totalCreditBack;
  
  // Cash in Hand = TTS - (QR + Card + Cheques + Manager Cash + Credit Sales + Lost)
  const selfReported = qrTransfer + card + cheques + managerCash + totalCreditSales + lost;
  const cashInHand = TTS - selfReported;

  const handleFinalSubmit = async () => {
    // ✅ Prevent double submissions
    if (loading) {
      console.warn("⚠️ Submission already in progress");
      return;
    }

    const updated = {
      ...formData,
      shift: {
        ...formData.shift,
        sales: {
          ...formData.shift.sales,
          cashInHand: cashInHand.toFixed(2),
          creditSalesTotal: totalCreditSales.toFixed(2),
          creditBackTotal: totalCreditBack.toFixed(2),
        },
      },
    };

    setLoading(true);
    setErrorMessage("");

    try {
      const success = await onNext(updated);
      if (success) {
        setSubmitted(true);
      } else {
        setErrorMessage("Submission failed. Please try again.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      // Use the actual error message from the backend if available
      const errorMessage = err.message || "Submission failed. Please try again.";
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-xl border border-gray-200">
      <CardContent className="p-8 space-y-10">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Final Calculations
        </h2>

        {/* Fuel Sales */}
        <section className="space-y-6 bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            ⛽ Fuel Sales
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {fuelRevenueBreakdown}
          </div>
          <div className="text-right font-semibold text-xl text-blue-600 mt-6 pt-6 border-t">
            Total Fuel Revenue: ₹{formatINR(totalFuelRevenue.toFixed(2))}
          </div>
        </section>

        {/* Lube Sales */}
        <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            🛢️ Lube Sales
          </h3>
          <div className="mt-6">
            <div className="text-base font-medium text-gray-600">
              Total Lube Sales
            </div>
            <div className="text-xl font-semibold text-blue-600 mt-2">
              ₹{formatINR(totalLubeSales.toFixed(2))}
            </div>
          </div>
        </section>

        {/* Lost/Stolen */}
        {lost > 0 && (
          <section className="bg-white p-8 rounded-xl border border-red-200 shadow-sm">
            <h3 className="text-2xl font-bold text-red-600 flex items-center gap-2">
              🚨 Lost or Stolen Cash
            </h3>
            <div className="mt-6">
              <div className="text-base font-medium text-red-600">
                Amount Lost
              </div>
              <div className="text-xl font-semibold text-red-600 mt-2">
                ₹{formatINR(lost.toFixed(2))}
              </div>
            </div>
          </section>
        )}

        {/* Calibration Revenue Loss */}
        {totalCalibrationRevenue > 0 && (
          <section className="bg-white p-8 rounded-xl border border-orange-200 shadow-sm">
            <h3 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
              🔧 Calibration Revenue Loss
            </h3>
            <div className="mt-6">
              <div className="text-base font-medium text-orange-600">
                Revenue Lost from Testing/Calibration
              </div>
              <div className="text-xl font-semibold text-orange-600 mt-2">
                ₹{formatINR(totalCalibrationRevenue.toFixed(2))}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Fuel used for nozzle testing and calibration
              </div>
            </div>
          </section>
        )}

        {/* Total Theoretical Sale */}
        <section className="bg-white p-8 rounded-xl border border-blue-200 shadow-sm">
          <h3 className="text-2xl font-bold text-blue-800">
            Total Theoretical Sale (TTS)
          </h3>
          <div className="mt-6">
            <div className="text-base font-medium text-blue-600">
              Fuel Revenue + Lube Sales + Credit Back (Cash Potential)
            </div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              ₹{formatINR(TTS.toFixed(2))}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              (₹{formatINR(totalFuelRevenue.toFixed(2))} + ₹{formatINR(totalLubeSales.toFixed(2))} + ₹{formatINR(totalCreditBack.toFixed(2))})
            </div>
          </div>
        </section>

        {/* Reported Receipts */}
        <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-800">
            🧾 Reported Receipts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="text-base font-medium text-gray-600">
                Credit Sales
              </div>
              <div className="text-xl font-medium text-gray-800 mt-2">
                ₹{formatINR(totalCreditSales.toFixed(2))}
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="text-base font-medium text-gray-600">
                QR Transfer
              </div>
              <div className="text-xl font-medium text-gray-800 mt-2">
                ₹{formatINR(qrTransfer.toFixed(2))}
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="text-base font-medium text-gray-600">
                Card Payments
              </div>
              <div className="text-xl font-medium text-gray-800 mt-2">
                ₹{formatINR(card.toFixed(2))}
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="text-base font-medium text-gray-600">
                Cheques
              </div>
              <div className="text-xl font-medium text-gray-800 mt-2">
                ₹{formatINR(cheques.toFixed(2))}
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="text-base font-medium text-gray-600">
                Cash with Manager
              </div>
              <div className="text-xl font-medium text-gray-800 mt-2">
                ₹{formatINR(managerCash.toFixed(2))}
              </div>
            </div>
            {lost > 0 && (
              <div className="p-6 bg-red-50 rounded-xl border border-red-200 hover:border-red-300 transition-colors">
                <div className="text-base font-medium text-red-600">
                  Lost/Stolen
                </div>
                <div className="text-xl font-medium text-red-800 mt-2">
                  ₹{formatINR(lost.toFixed(2))}
                </div>
              </div>
            )}
            <div className="p-6 bg-purple-50 rounded-xl border border-purple-200 hover:border-purple-300 transition-colors">
              <div className="text-base font-medium text-purple-600">
                Credit Back
              </div>
              <div className="text-xl font-medium text-purple-800 mt-2">
                ₹{formatINR(totalCreditBack.toFixed(2))}
              </div>
            </div>
          </div>
        </section>

        {/* Final Cash in Hand */}
        <section className="bg-white p-8 rounded-xl border border-green-200 shadow-sm">
          <h3 className="text-2xl font-bold text-green-800">
            Calculated Cash in Hand
          </h3>
          <div className="mt-6">
            <div className="text-base font-medium text-green-600">
              Final Amount
            </div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              ₹{formatINR(cashInHand.toFixed(2))}
            </div>
            <div className="text-sm text-gray-500 mt-3">
              (TTS − QR − Card − Cheques − Cash with Manager − Credit Sales − Lost)
            </div>
          </div>
        </section>

        {/* Buttons */}
        {!submitted && (
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={loading}
              className="h-11 px-6"
            >
              Back
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  disabled={loading}
                  className="h-11 px-6 bg-black text-white hover:bg-gray-800"
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit the final shift report?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinalSubmit}>
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {errorMessage && (
          <div className="text-red-600 font-medium text-sm mt-4">
            {errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalcForm;
