import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/utils/formatting";

const ReviewForm = ({ formData, onNext, onBack }) => {
  const { shift = {}, creditSales = [], creditBack = [] } = formData;

  const {
    sales = {},
    readings = [],
    lubeSales = [],
    nozzleTesting = [],
    dayRate = {},
  } = shift;

  const groupedReadings = readings.reduce((acc, curr) => {
    if (!acc[curr.fuelType]) acc[curr.fuelType] = [];
    acc[curr.fuelType].push(curr);
    return acc;
  }, {});

  const nozzleTestingMap = nozzleTesting.reduce((acc, entry) => {
    acc[entry.fuelType] = parseFloat(entry.quantity || 0);
    return acc;
  }, {});

  let fuelRevenue = 0;
  for (const [fuelType, entries] of Object.entries(groupedReadings)) {
    const rate = parseFloat(parseFloat(dayRate[fuelType] || 0).toFixed(2));
    const totalVolume = entries.reduce(
      (sum, r) =>
        sum + (parseFloat(r.closing || 0) - parseFloat(r.opening || 0)),
      0
    );
    const netVolume = totalVolume - (nozzleTestingMap[fuelType] || 0);
    fuelRevenue += parseFloat((netVolume * rate).toFixed(2));
  }

  const lubeRevenue = parseFloat(
    lubeSales
      .reduce(
        (sum, l) => sum + parseFloat(parseFloat(l.amount || 0).toFixed(2)),
        0
      )
      .toFixed(2)
  );
  const creditBackTotal = parseFloat(
    creditBack
      .reduce(
        (sum, p) => sum + parseFloat(parseFloat(p.amount || 0).toFixed(2)),
        0
      )
      .toFixed(2)
  );
  const lost = parseFloat(parseFloat(sales.lost || 0).toFixed(2));
  const total = parseFloat((fuelRevenue + lubeRevenue + creditBackTotal - lost).toFixed(2));

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-xl border border-gray-200">
      <CardContent className="p-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-10">
          Review Shift Details
        </h2>

        <div className="space-y-10">
          {/* === Fuel Rates === */}
          <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">
              Fuel Rates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(dayRate).map(([fuel, rate]) => (
                <div
                  key={fuel}
                  className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-600">
                    {fuel}
                  </div>
                  <div className="text-xl font-semibold mt-1">₹{rate}/L</div>
                </div>
              ))}
            </div>
          </section>

          {/* === Meter Readings === */}
          <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">
              Meter Readings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {readings.map((r, i) => (
                <div
                  key={i}
                  className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="text-base font-semibold text-gray-800 mb-4">
                    {r.fuelType} - Nozzle {r.nozzle}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        Opening
                      </div>
                      <div className="text-lg font-medium text-gray-700 mt-1">
                        {r.opening}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        Closing
                      </div>
                      <div className="text-lg font-medium text-gray-700 mt-1">
                        {r.closing}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* === Nozzle Testing === */}
          {nozzleTesting.length > 0 && (
            <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">
                Nozzle Testing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {nozzleTesting.map((test, i) => (
                  <div
                    key={i}
                    className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="text-base font-semibold text-gray-800">
                      {test.fuelType}
                    </div>
                    <div className="text-xl font-medium text-gray-700 mt-2">
                      {test.quantity} litres
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* === Lube Sales === */}
          {lubeSales.length > 0 && (
            <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">
                Lube Sales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lubeSales.map((lube, i) => (
                  <div
                    key={i}
                    className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="text-base font-semibold text-gray-800 mb-4">
                      {lube.description}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Quantity
                        </div>
                        <div className="text-lg font-medium text-gray-700 mt-1">
                          {lube.quantity}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Amount
                        </div>
                        <div className="text-lg font-medium text-gray-700 mt-1">
                          ₹{formatINR(lube.amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* === Credit Sales === */}
          {creditSales.length > 0 && (
            <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">
                Credit Sales
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Account</th>
                      <th className="text-left p-3 font-medium text-gray-600">Fuel Type</th>
                      <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                      <th className="text-right p-3 font-medium text-gray-600">Quantity</th>
                      <th className="text-right p-3 font-medium text-gray-600">Rate</th>
                      <th className="text-left p-3 font-medium text-gray-600">Due Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditSales.map((d, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-sm">{d.code}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{d.fuelType}</span>
                        </td>
                        <td className="p-3 text-right font-medium text-green-600">
                          ₹{formatINR(d.amount)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {(
                            parseFloat(d.amount || 0) /
                            parseFloat(dayRate[d.fuelType] || 1)
                          ).toFixed(2)} L
                        </td>
                        <td className="p-3 text-right">
                          ₹{formatINR(dayRate[d.fuelType] || 0)}/L
                        </td>
                        <td className="p-3">
                          <span className="text-sm">{d.dueDate}</span>
                        </td>
                        <td className="p-3">
                          {d.description && (
                            <span className="text-sm text-gray-600 max-w-32 truncate" title={d.description}>
                              {d.description}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* === Credit Backs === */}
          {creditBack.length > 0 && (
            <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">
                Credit Backs
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Account</th>
                      <th className="text-left p-3 font-medium text-gray-600">Payment Type</th>
                      <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left p-3 font-medium text-gray-600">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditBack.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-sm">{p.code}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{p.paymentType}</span>
                        </td>
                        <td className="p-3 text-right font-medium text-green-600">
                          ₹{formatINR(p.amount)}
                        </td>
                        <td className="p-3">
                          {p.note && (
                            <span className="text-sm text-gray-600" title={p.note}>
                              {p.note}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* === Sales Summary === */}
          <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">
              Sales Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="text-base font-medium text-gray-600">
                  Cash with Manager
                </div>
                <div className="text-xl font-semibold text-gray-700 mt-2">
                  ₹{formatINR(sales.cashWithManager)}
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="text-base font-medium text-gray-600">
                  QR Transfer
                </div>
                <div className="text-xl font-semibold text-gray-700 mt-2">
                  ₹{formatINR(sales.qrTransfer)}
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="text-base font-medium text-gray-600">Card</div>
                <div className="text-xl font-semibold text-gray-700 mt-2">
                  ₹{formatINR(sales.card)}
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl border border-red-200 hover:border-red-300 transition-colors">
                <div className="text-base font-medium text-red-600">Lost</div>
                <div className="text-xl font-semibold text-red-600 mt-2">
                  ₹{formatINR(sales.lost)}
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="text-base font-medium text-gray-600">
                  Credit Sales Total
                </div>
                <div className="text-xl font-semibold text-gray-700 mt-2">
                  ₹{formatINR(sales.creditSalesTotal)}
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="text-base font-medium text-gray-600">
                  Credit Back Total
                </div>
                <div className="text-xl font-semibold text-gray-700 mt-2">
                  ₹{formatINR(sales.creditBackTotal)}
                </div>
              </div>
            </div>
          </section>
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

export default ReviewForm;
