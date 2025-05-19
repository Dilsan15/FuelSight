import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ReviewForm = ({ formData, onNext, onBack }) => {
  const { shift, deferals, payments } = formData;
  const {
    submittedByName,
    date,
    dayRate = {},
    sales = {},
    readings = [],
    lubeSales = [],
    thrownOutFuel = [],
    timeType = "",
  } = shift;

  const groupedReadings = readings.reduce((acc, curr) => {
    if (!acc[curr.fuelType]) acc[curr.fuelType] = [];
    acc[curr.fuelType].push(curr);
    return acc;
  }, {});

  return (
    <Card className="p-6 space-y-6 bg-gradient-to-br from-[#fefefe] to-[#f5f5f5] border border-gray-300 shadow-xl rounded-xl">
      <CardContent className="space-y-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Review Your Submission
        </h2>

        <div className="space-y-6 text-sm text-gray-800">
          <section>
            <h3 className="text-xl font-semibold mb-2">Shift Info</h3>
            <div className="bg-white p-4 rounded-lg shadow border">
              <p>
                <strong>Worker:</strong> {submittedByName}
              </p>
              <p>
                <strong>Date:</strong> {date}
              </p>
              <p>
                <strong>Shift Type:</strong> {timeType}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Fuel Day Rates</h3>
            <div className="bg-white p-4 rounded-lg shadow border">
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(dayRate).map(([fuel, rate]) => (
                  <li key={fuel}>
                    <strong>{fuel}:</strong> ₹{rate}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {thrownOutFuel.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold mb-2">Thrown Out Fuel</h3>
              <div className="bg-white p-4 rounded-lg shadow border">
                <ul className="list-disc list-inside space-y-1">
                  {thrownOutFuel.map((t, i) => (
                    <li key={i}>
                      <strong>{t.fuelType}:</strong> {t.quantity} L
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {Object.keys(groupedReadings).length > 0 && (
            <section>
              <h3 className="text-xl font-semibold mb-2">Fuel Readings</h3>
              <div className="space-y-4">
                {Object.entries(groupedReadings).map(
                  ([fuelType, entries], idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-lg shadow border"
                    >
                      <h4 className="text-lg font-semibold mb-2">{fuelType}</h4>
                      <ul className="space-y-1">
                        {entries.map((entry, i) => {
                          const diff =
                            (entry.closing ?? 0) - (entry.opening ?? 0);
                          return (
                            <li key={`${entry.fuelType}-${i}`}>
                              <strong>Opening:</strong> {entry.opening} | {" "}
                              <strong>Closing:</strong> {entry.closing} | {" "}
                              <strong>Sold:</strong> {diff}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {lubeSales.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold mb-2">Lube/Mobil Sales</h3>
              <div className="space-y-4">
                {lubeSales.map((l, i) => (
                  <div
                    key={i}
                    className="bg-white p-4 rounded-lg shadow border"
                  >
                    <p>
                      <strong>Description:</strong> {l.description}
                    </p>
                    <p>
                      <strong>Amount:</strong> ₹{l.amount}
                    </p>
                    <p>
                      <strong>Quantity:</strong> {l.quantity}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xl font-semibold mb-2">Sales Summary</h3>
            <div className="bg-white p-4 rounded-lg shadow border">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Cash with Manager:</strong> ₹{sales.cashWithManager || 0}
                </li>
                <li>
                  <strong>QR Transfer:</strong> ₹{sales.qrTransfer || 0}
                </li>
                <li>
                  <strong>Card:</strong> ₹{sales.card || 0}
                </li>
                <li>
                  <strong>Deferral Total:</strong> ₹{sales.deferralTotal || 0}
                </li>
                <li>
                  <strong>Advance Payment Total:</strong> ₹{sales.advancePaymentTotal || 0}
                </li>
                <li>
                  <strong>Lost/Stolen:</strong> ₹{sales.lost || 0}
                </li>
              </ul>
            </div>
          </section>

          {deferals.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold mb-2">Deferals</h3>
              <div className="space-y-4">
                {deferals.map((d, i) => (
                  <div
                    key={i}
                    className="bg-white p-4 rounded-lg shadow border"
                  >
                    <p>
                      <strong>Code:</strong> {d.code}
                    </p>
                    <p>
                      <strong>Fuel Type:</strong> {d.fuelType}
                    </p>
                    <p>
                      <strong>Litres:</strong> {d.litres}
                    </p>
                    <p>
                      <strong>Amount:</strong> ₹
                      {d.amount ||
                        (d.litres * (dayRate[d.fuelType] || 0)).toFixed(2)}
                    </p>
                    <p>
                      <strong>Due Date:</strong> {d.dueDate}
                    </p>
                    {d.description && (
                      <p>
                        <strong>Description:</strong> {d.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {payments.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold mb-2">Payments</h3>
              <div className="space-y-4">
                {payments.map((p, i) => (
                  <div
                    key={i}
                    className="bg-white p-4 rounded-lg shadow border"
                  >
                    <p>
                      <strong>Code:</strong> {p.code}
                    </p>
                    <p>
                      <strong>Amount:</strong> ₹{p.amount}
                    </p>
                    <p>
                      <strong>Method:</strong> {p.paymentType}
                    </p>
                    {p.note && (
                      <p>
                        <strong>Note:</strong> {p.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            className="bg-white text-black border border-gray-300 hover:bg-gray-100"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
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

export default ReviewForm;
