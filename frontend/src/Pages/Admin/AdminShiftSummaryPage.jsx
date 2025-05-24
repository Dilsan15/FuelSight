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
    shiftDateSubmitted,
    sales = {},
    readings = [],
    thrownOutFuel = [],
    lubeSales = [],
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
    (sum, l) => sum + Number(l.amount) * Number(l.quantity),
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

  // Per-nozzle revenue:  Σ(volume × dayRate)
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

  // TTS  ( Fuel Revenue + Credit Sales )
  const TTS = totalFuelRevenue + totalCreditSales;

  // Self-reported (for reconciliation)
  const qrTransfer = Number(sales.qrTransfer || 0);
  const card = Number(sales.card || 0);
  const managerCash = Number(sales.cashWithManager || 0);
  const lost = Number(sales.lost || 0);
  const cashInHand = Number(sales.cashInHand || 0);
  const selfReported = totalCreditSales + qrTransfer + card + managerCash;

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
          <p className="text-gray-600 mt-1">
            {timeType} Shift – {formatDateUTC(shiftDateSubmitted)}
          </p>
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
                  shift.
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
              <span className="font-medium">Total Revenue:</span>{" "}
              {formatINR(totalFuelRevenue + totalCreditSales + totalCreditBack + totalLube)}
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

      {/* TTS Summary */}
      <Card className="bg-gradient-to-br from-background to-muted border border-border shadow-lg rounded-xl">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900">
            Total Transaction Summary (TTS)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* left column */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Fuel Revenue</span>
                <span className="font-medium">
                  {formatINR(totalFuelRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Credit Sales (Deferals)</span>
                <span className="font-medium">
                  {formatINR(totalCreditSales)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 font-semibold">
                <span>Total TTS</span>
                <span>{formatINR(TTS)}</span>
              </div>
            </div>

            {/* right column – self-reported */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Cash with Manager</span>
                <span className="font-medium">{formatINR(managerCash)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">QR Transfer</span>
                <span className="font-medium">{formatINR(qrTransfer)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Card</span>
                <span className="font-medium">{formatINR(card)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Credit Sales</span>
                <span className="font-medium">
                  {formatINR(totalCreditSales)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 font-semibold">
                <span>Cash in Hand</span>
                <span>{formatINR(cashInHand)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales & Payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-gray-200 shadow-md rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
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
                <span className="text-gray-600">Lost/Stolen</span>
                <span className="font-medium text-red-600">
                  {formatINR(sales.lost)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 font-semibold">
                <span>Total Cash in Hand</span>
                <span>{formatINR(sales.cashInHand)}</span>
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

        {/* Thrown Out Fuel */}
        {thrownOutFuel.length > 0 && (
          <Card className="border border-gray-200 shadow-md rounded-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Thrown Out Fuel
              </h3>
              <div className="space-y-4">
                {thrownOutFuel.map((f, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600">Fuel Type:</span>{" "}
                        <span className="font-medium">{f.fuelType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Quantity:</span>{" "}
                        <span className="font-medium">{f.quantity} L</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Credit Sales and Credit Backs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="space-y-3">
                {creditSales.map((d, i) => (
                  <Link
                    key={i}
                    to={`/order-summary/${d._id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Code:</span>{" "}
                        <span className="font-medium">{d.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Account:</span>{" "}
                        <span className="font-medium">{d.actName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>{" "}
                        <span className="font-medium">
                          {formatINR(d.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fuel:</span>{" "}
                        <span className="font-medium">
                          {d.fuelType} - {d.quantity} L
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Due:</span>{" "}
                        <span className="font-medium">
                          {formatDateUTC(d.dueDate)}
                        </span>
                      </div>
                      {d.description && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Note:</span>{" "}
                          <span className="font-medium">{d.description}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
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
              <div className="space-y-3">
                {creditBack.map((p, i) => (
                  <Link
                    key={i}
                    to={`/order-summary/${p._id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Code:</span>{" "}
                        <span className="font-medium">{p.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Account:</span>{" "}
                        <span className="font-medium">{p.actName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>{" "}
                        <span className="font-medium">
                          {formatINR(p.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>{" "}
                        <span className="font-medium">{p.paymentType}</span>
                      </div>
                      {p.description && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Note:</span>{" "}
                          <span className="font-medium">{p.description}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminShiftSummaryPage;
