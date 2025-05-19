import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CalcForm = ({ formData, setFormData, onBack, onNext }) => {
  const { shift = {}, payments = [], deferals = [] } = formData;
  const {
    readings = [],
    thrownOutFuel = [],
    lubeSales = [],
    sales = {},
    dayRate = {},
  } = shift;

  // Group readings by fuelType
  const groupedReadings = readings.reduce((acc, curr) => {
    if (!acc[curr.fuelType]) acc[curr.fuelType] = [];
    acc[curr.fuelType].push(curr);
    return acc;
  }, {});

  const thrownMap = thrownOutFuel.reduce((acc, entry) => {
    acc[entry.fuelType] = parseFloat(entry.quantity || 0);
    return acc;
  }, {});

  // === Fuel Revenue Summary ===
  let totalFuelRevenue = 0;
  const fuelRevenueBreakdown = Object.entries(groupedReadings).map(
    ([fuelType, entries]) => {
      const rate = parseFloat(dayRate[fuelType] || 0);
      const totalVolume = entries.reduce((sum, reading) => {
        const opening = parseFloat(reading.opening || 0);
        const closing = parseFloat(reading.closing || 0);
        return sum + (closing - opening);
      }, 0);

      const thrown = thrownMap[fuelType] || 0;
      const netVolume = totalVolume - thrown;
      const revenue = netVolume * rate;

      totalFuelRevenue += revenue;

      return (
        <div
          key={fuelType}
          className="bg-gray-100 p-4 rounded-md shadow-sm space-y-1"
        >
          <h4 className="font-semibold text-lg">{fuelType}</h4>
          <p>Total Volume: {totalVolume.toFixed(2)} L</p>
          <p>Thrown Out: {thrown.toFixed(2)} L</p>
          <p>Net Volume: {netVolume.toFixed(2)} L</p>
          <p>Rate: ₹{rate.toFixed(2)}</p>
          <p>Revenue: ₹{revenue.toFixed(2)}</p>
        </div>
      );
    }
  );

  const totalLubeSales = lubeSales.reduce(
    (sum, sale) => sum + parseFloat(sale.amount || 0),
    0
  );
  const totalDeferral = deferals.reduce(
    (sum, d) => sum + parseFloat(d.amount || d.litres * (dayRate[d.fuelType] || 0) || 0),
    0
  );
  const totalPayments = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0
  );

  const qrTransfer = parseFloat(sales.qrTransfer || 0);
  const card = parseFloat(sales.card || 0);
  const managerCash = parseFloat(sales.cashWithManager || 0);
  const lost = parseFloat(sales.lost || 0);

  // === TTS (Theoretical Total Sale) and Final Calculations ===
  const TTS = totalFuelRevenue + totalLubeSales - lost;
  const selfReported = totalDeferral + qrTransfer + card + managerCash;
  const cashInHand = TTS - selfReported;

  return (
    <Card className="p-6 space-y-6 bg-white border border-gray-200 shadow-lg">
      <CardContent className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Revenue Breakdown</h2>

        {/* Fuel Sales */}
        <div className="space-y-2 border border-gray-300 bg-gray-50 p-4 rounded-md shadow-sm">
          <h3 className="text-xl font-semibold">⛽ Fuel Sales</h3>
          {fuelRevenueBreakdown}
          <p className="text-right font-semibold">
            Fuel Total: ₹{totalFuelRevenue.toFixed(2)}
          </p>
        </div>

        {/* Lube Sales */}
        <div className="space-y-2 border border-yellow-400 bg-yellow-50 p-4 rounded-md shadow-sm">
          <h3 className="text-xl font-semibold text-yellow-800">
            🛢️ Lube Sales
          </h3>
          <p className="text-lg font-medium">
            Total Lube Sales: ₹{totalLubeSales.toFixed(2)}
          </p>
        </div>

        {/* Lost/Stolen Cash */}
        <div className="space-y-2 border border-red-400 bg-red-50 p-4 rounded-md shadow-sm">
          <h3 className="text-xl font-extrabold text-red-700 flex items-center gap-2">
            🚨 Lost or Stolen Cash
          </h3>
          <p className="text-lg font-bold text-red-800">₹{lost.toFixed(2)}</p>
        </div>

        <hr />

        <div className="text-lg font-bold text-right text-blue-800">
          Total Theoretical Sale (TTS): ₹{TTS.toFixed(2)}
        </div>

        <hr />

        <div className="space-y-2 border border-green-300 bg-green-50 p-4 rounded-md shadow-sm">
          <h2 className="text-xl font-semibold text-green-900">
            🧾 Reported Receipts
          </h2>
          <p>Deferral Orders: ₹{totalDeferral.toFixed(2)}</p>
          <p>QR Transfer: ₹{qrTransfer.toFixed(2)}</p>
          <p>Card Payments: ₹{card.toFixed(2)}</p>
          <p>Cash with Manager: ₹{managerCash.toFixed(2)}</p>
        </div>

        <hr />

        <div className="text-lg font-bold text-right text-green-700">
          Calculated Cash in Hand: ₹{cashInHand.toFixed(2)}
        </div>
        <div className="text-right text-gray-500">
          (TTS − Deferrals − QR − Card − Cash with Manager)
        </div>

        <div className="flex justify-between pt-4">
          <Button onClick={onBack}>Back</Button>
          <Button
            onClick={() => {
              const updated = {
                ...formData,
                shift: {
                  ...formData.shift,
                  sales: {
                    ...formData.shift.sales,
                    cashInHand: cashInHand.toFixed(2),
                    deferralTotal: totalDeferral.toFixed(2),
                  },
                },
              };
              setFormData(updated);
              onNext(updated);
            }}
          >
            Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalcForm;
