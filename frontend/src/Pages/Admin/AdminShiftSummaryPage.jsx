import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGetShift } from "@/Hooks/ShiftHooks/useShift";
import { useDeleteShift } from "@/Hooks/ShiftHooks/useDeleteShift";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/utils/formatting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ---------- helpers ---------- */
const formatDateUTC = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const AdminShiftSummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shift, loading, error, fetchShift } = useGetShift();
  const { deleteShift } = useDeleteShift();

  /* ---------- data fetch ---------- */
  useEffect(() => {
    fetchShift(id);
  }, [id]);

  const handleDelete = async () => {
    try {
      await deleteShift(id);
      navigate("/admin-shifts");
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------- loading / error ---------- */
  if (loading) return <Skeleton className="w-full h-48" />;
  if (error || !shift)
    return (
      <div className="p-6 text-red-600">
        Shift not found or failed to load.
      </div>
    );

  /* ---------- de-structuring ---------- */
  const {
    user,
    submittedByName,
    timeType,
    date,
    shiftDateSubmitted,
    createdAt,
    sales = {},
    readings = [],
    lubeSales = [],
    nozzleTesting = [],
    creditSales = [],
    creditBack = [],
    dayRate = {},
  } = shift;

  /* ---------- computed totals ---------- */
  // Fuel volume (litres) – kept for reference
  const totalFuelSoldL = readings.reduce(
    (sum, r) => sum + (r.closing - r.opening),
    0
  );

  // Lube revenue (₹)
  const totalLube = lubeSales.reduce(
    (sum, l) => sum + Number(l.amount || 0),
    0
  );

  // Deferral / credit-sales totals (₹)
  const totalCreditSales = creditSales.reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0
  );
  const totalCreditBack = creditBack.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  // Per-nozzle revenue:  Σ(volume × dayRate) - calibration cost
  const totalFuelRevenue = Object.entries(
    readings.reduce((acc, r) => {
      acc[r.fuelType] = (acc[r.fuelType] || 0) + (r.closing - r.opening);
      return acc;
    }, {})
  ).reduce(
    (sum, [fuelType, litres]) =>
      sum + litres * Number(dayRate[fuelType] || 0),
    0
  );

  // Calculate calibration fuel cost to subtract from fuel revenue
  const totalCalibrationCost = nozzleTesting.reduce(
    (sum, testing) => {
      const rate = Number(dayRate[testing.fuelType] || 0);
      const quantity = Number(testing.quantity || 0);
      return sum + (quantity * rate);
    },
    0
  );

  // Adjusted fuel revenue (subtract calibration cost)
  const adjustedFuelRevenue = totalFuelRevenue - totalCalibrationCost;

  // TTS = Fuel Revenue + Lube Sales + Credit Back (Total Theoretical Sale)
  const totalLubeSales = lubeSales.reduce(
    (sum, sale) => sum + parseFloat(sale.amount || 0),
    0
  );
  const TTS = adjustedFuelRevenue + totalLubeSales + totalCreditBack;

  // Self-reported (for reconciliation)
  const qrTransfer = Number(sales.qrTransfer || 0);
  const card = Number(sales.card || 0);
  const cheques = Number(sales.cheques || 0);
  const managerCash = Number(sales.cashWithManager || 0);
  const lost = Number(sales.lost || 0);
  const cashInHand = Number(sales.cashInHand || 0);
  const selfReported = qrTransfer + card + cheques + managerCash;

  /* ---------- group readings by fuel type ---------- */
  const groupedReadings = readings.reduce((acc, curr) => {
    if (!acc[curr.fuelType]) acc[curr.fuelType] = [];
    acc[curr.fuelType].push(curr);
    return acc;
  }, {});

  /* ===== JSX ========================================================= */
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.stationName || "Unknown Station"}
          </h1>
          <div className="text-gray-600 mt-1 space-y-1">
            <p>{timeType} Shift – {formatDateUTC(date)}</p>
            <p className="text-sm">
              <span className="font-medium">Submitted:</span> {formatDateUTC(shiftDateSubmitted)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/edit-shift/${id}`)}
          >
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Shift</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  shift and all associated orders. Account balances will be updated accordingly.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Primary Info Card */}
      <Card className="bg-gradient-to-br from-background to-muted border border-border shadow-lg rounded-xl">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Worker Details</h3>
            <p className="text-gray-700">
              <span className="font-medium">Name:</span> {submittedByName}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Station:</span>{" "}
              {user?.stationName}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Shift Summary</h3>
            <p className="text-gray-700">
              <span className="font-medium">Total Fuel:</span>{" "}
              {totalFuelSoldL.toFixed(2)} L
            </p>
            <p className="text-gray-700">
              <span className="font-medium">TTS:</span>{" "}
              {formatINR(TTS)}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Day Rates</h3>
            {Object.entries(dayRate).map(([type, rate]) => (
              <p key={type} className="text-gray-700">
                <span className="font-medium">{type}:</span> ₹{rate}/L
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* TTS & Cash Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* TTS Calculation */}
        <Card className="bg-white border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <h3 className="text-xl font-semibold text-gray-900">
                Total Theoretical Sale (TTS)
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Fuel Revenue</span>
                <span className="font-semibold text-gray-900 text-lg">
                  {formatINR(adjustedFuelRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Lube Sales</span>
                <span className="font-semibold text-gray-900 text-lg">
                  {formatINR(totalLubeSales)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Credit Back</span>
                <span className="font-semibold text-gray-900 text-lg">
                  {formatINR(totalCreditBack)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                <span className="text-gray-900 font-semibold text-lg">Total TTS</span>
                <span className="font-bold text-gray-900 text-xl">{formatINR(TTS)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash in Hand Calculation */}
        <Card className="bg-white border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <h3 className="text-xl font-semibold text-gray-900">
                Cash in Hand Calculation
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">TTS (Fuel + Lube + Credit Back)</span>
                <span className="font-medium text-green-600">
                  +{formatINR(TTS)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">QR Transfer</span>
                <span className="font-medium text-red-500">
                  -{formatINR(qrTransfer)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Card Payments</span>
                <span className="font-medium text-red-500">
                  -{formatINR(card)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Cheques</span>
                <span className="font-medium text-red-500">
                  -{formatINR(cheques)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Cash with Manager</span>
                <span className="font-medium text-red-500">
                  -{formatINR(managerCash)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Credit Sales</span>
                <span className="font-medium text-red-500">
                  -{formatINR(totalCreditSales)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Lost/Stolen</span>
                <span className="font-medium text-red-500">
                  -{formatINR(lost)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4 mt-4">
                <span className="text-gray-900 font-semibold text-lg">Cash in Hand</span>
                <span className="font-bold text-gray-900 text-xl">{formatINR(TTS - qrTransfer - card - cheques - managerCash - totalCreditSales - lost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

                {/* Credit Transactions Summary */}
        <Card className="bg-white border-gray-200 shadow-lg rounded-xl hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              <h3 className="text-xl font-semibold text-gray-900">
                Credit Transactions Summary
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Credit Sales (IOUs)</span>
                <span className="font-semibold text-gray-900 text-lg">
                  {formatINR(totalCreditSales)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Credit Back (Advance Payments)</span>
                <span className="font-semibold text-gray-900 text-lg">
                  {formatINR(totalCreditBack)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {totalCreditSales > 0 && (
                  <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded">
                    Credit Sales: {creditSales.length} transaction{creditSales.length !== 1 ? 's' : ''}
                  </div>
                )}
                {totalCreditBack > 0 && (
                  <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded">
                    Credit Back: {creditBack.length} transaction{creditBack.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Sales & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="border border-gray-200 shadow-md rounded-xl">
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-900">
              Sales Breakdown
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Cash with Manager</span>
                <span className="font-medium">
                  {formatINR(sales.cashWithManager)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">QR Transfer</span>
                <span className="font-medium">
                  {formatINR(sales.qrTransfer)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Card</span>
                <span className="font-medium">{formatINR(sales.card)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Cheques</span>
                <span className="font-medium">{formatINR(sales.cheques)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Lost/Stolen</span>
                <span className="font-medium text-red-600">
                  {formatINR(sales.lost)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 font-semibold">
                <span>Cash in Hand</span>
                <span>{formatINR(TTS - qrTransfer - card - cheques - managerCash - totalCreditSales - lost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              Fuel Readings
            </h3>
            <div className="space-y-4">
              {Object.entries(groupedReadings).map(([fuelType, readings]) => (
                <div key={fuelType} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{fuelType}</h4>
                  <div className="space-y-2">
                    {readings.map((r, i) => (
                      <div key={i} className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Nozzle:</span>{" "}
                          <span className="font-medium">{r.nozzle}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Opening:</span>{" "}
                          <span className="font-medium">{r.opening}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Closing:</span>{" "}
                          <span className="font-medium">{r.closing}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lube Sales */}
        {lubeSales.length > 0 && (
          <Card className="border border-gray-200 shadow-md rounded-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Lube/Mobil Sales
              </h3>
              <div className="space-y-4">
                {lubeSales.map((l, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600">Description:</span>{" "}
                        <span className="font-medium">{l.description}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>{" "}
                        <span className="font-medium">
                          {formatINR(l.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Quantity:</span>{" "}
                        <span className="font-medium">{l.quantity} L</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nozzle Testing */}
        {nozzleTesting.length > 0 && (
          <Card className="border border-gray-200 shadow-md rounded-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Fuel Testing/Calibration
              </h3>
              <div className="space-y-4">
                <div className="grid gap-4">
                  {nozzleTesting.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium">{f.fuelType}</span>
                      <span>{f.quantity} L</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Credit Sales and Credit Backs */}
      <div className="grid grid-cols-1 gap-6">
        {/* Credit Sales */}
        {creditSales.length > 0 && (
          <Card className="border border-gray-200 shadow-md rounded-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Credit Sales
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Total: {formatINR(totalCreditSales)})
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Code</th>
                      <th className="text-left p-3 font-medium text-gray-600">Account</th>
                      <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left p-3 font-medium text-gray-600">Fuel</th>
                      <th className="text-right p-3 font-medium text-gray-600">Quantity</th>
                      <th className="text-left p-3 font-medium text-gray-600">Due Date</th>
                      <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditSales.map((d, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-sm">{d.code}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{d.actName}</span>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatINR(d.amount)}
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{d.fuelType}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-medium">{d.quantity} L</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">{formatDateUTC(d.dueDate)}</span>
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            to={`/order-summary/${d._id}`}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credit Backs */}
        {creditBack.length > 0 && (
          <Card className="border border-gray-200 shadow-md rounded-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Credit Backs
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Total: {formatINR(totalCreditBack)})
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Code</th>
                      <th className="text-left p-3 font-medium text-gray-600">Account</th>
                      <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left p-3 font-medium text-gray-600">Payment Type</th>
                      <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditBack.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-sm">{p.code}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{p.actName}</span>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatINR(p.amount)}
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{p.paymentType}</span>
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            to={`/order-summary/${p._id}`}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminShiftSummaryPage;
