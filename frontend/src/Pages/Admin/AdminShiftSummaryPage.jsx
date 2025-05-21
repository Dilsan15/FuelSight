import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGetShift } from "@/Hooks/ShiftHooks/useShift";
import { useDeleteShift } from "@/Hooks/ShiftHooks/useDeleteShift";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(val || 0);

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

  useEffect(() => {
    fetchShift(id);
  }, [id]);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this shift?"
    );
    if (!confirmed) return;

    try {
      await deleteShift(id);
      alert("Shift deleted successfully.");
      navigate("/admin-shifts");
    } catch (err) {
      alert("Failed to delete shift.");
      console.error(err);
    }
  };

  if (loading) return <Skeleton className="w-full h-48" />;
  if (error || !shift)
    return (
      <div className="p-6 text-red-600">Shift not found or failed to load.</div>
    );

  const {
    user,
    submittedByName,
    timeType,
    shiftDateSubmitted,
    sales,
    readings,
    thrownOutFuel,
    lubeSales,
    deferrals = [],
    payments = [],
  } = shift;

  const totalFuelSold = readings.reduce(
    (sum, r) => sum + (r.closing - r.opening),
    0
  );
  const totalLube = lubeSales.reduce(
    (sum, l) => sum + l.amount * l.quantity,
    0
  );
  const totalPayment = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-muted min-h-screen text-gray-800">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {user?.stationName || "Unknown Station"} — {timeType} Shift
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/edit-shift/${id}`)}
          >
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="pt-6 space-y-3 text-sm">
          <div>
            <strong>Submitted By:</strong> {submittedByName}
          </div>
          <div>
            <strong>Date:</strong> {formatDateUTC(shiftDateSubmitted)}
          </div>
          <div>
            <strong>Total Fuel Sold:</strong> {totalFuelSold.toFixed(2)} L
          </div>
          <div>
            <strong>Total Payments:</strong> {formatCurrency(totalPayment)}
          </div>
          <div>
            <strong>Deferrals:</strong> {formatCurrency(sales.deferralTotal)}
          </div>
          <div>
            <strong>Lube Sales:</strong> {formatCurrency(totalLube)}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="pt-6 space-y-3 text-sm">
          <h2 className="font-semibold mb-2">Sales Breakdown</h2>
          <div>
            <strong>Cash In Hand:</strong> {formatCurrency(sales.cashInHand)}
          </div>
          <div>
            <strong>Cash With Manager:</strong>{" "}
            {formatCurrency(sales.cashWithManager)}
          </div>
          <div>
            <strong>QR Transfers:</strong> {formatCurrency(sales.qrTransfer)}
          </div>
          <div>
            <strong>Card:</strong> {formatCurrency(sales.card)}
          </div>
          <div>
            <strong>Lost Cash:</strong> {formatCurrency(sales.lost)}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="pt-6 space-y-3 text-sm">
          <h2 className="font-semibold mb-2">Fuel Readings</h2>
          {readings.map((r, i) => (
            <div key={i}>
              <strong>{r.fuelType}</strong>: {r.opening} → {r.closing} (
              {r.closing - r.opening} L)
            </div>
          ))}
        </CardContent>
      </Card>

      {thrownOutFuel?.length > 0 && (
        <Card className="border shadow-sm">
          <CardContent className="pt-6 space-y-3 text-sm">
            <h2 className="font-semibold mb-2">Thrown Out Fuel</h2>
            {thrownOutFuel.map((f, i) => (
              <div key={i}>
                <strong>{f.fuelType}:</strong> {f.quantity} L
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {lubeSales?.length > 0 && (
        <Card className="border shadow-sm">
          <CardContent className="pt-6 space-y-3 text-sm">
            <h2 className="font-semibold mb-2">Lube Sales</h2>
            {lubeSales.map((l, i) => (
              <div key={i}>
                <strong>
                  {l.quantity} × {formatCurrency(l.amount)}
                </strong>{" "}
                — {l.description}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(deferrals.length > 0 || payments.length > 0) && (
        <Card className="border shadow-sm">
          <CardContent className="pt-6 space-y-4 text-sm">
            <h2 className="font-semibold text-base">Linked Orders</h2>

            {deferrals.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Deferrals</h3>
                <div className="space-y-2">
                  {deferrals.map((d, i) => (
                    <Link
                      key={i}
                      to={`/order-summary/${d._id}`}
                      className="block p-3 rounded bg-gray-100 hover:bg-gray-200 transition"
                    >
                      <div>
                        <strong>Code:</strong> {d.code}
                      </div>
                      <div>
                        <strong>Account:</strong> {d.actName}
                      </div>
                      <div>
                        <strong>Amount:</strong> {formatCurrency(d.amount)}
                      </div>
                      <div>
                        <strong>Fuel:</strong> {d.fuelType} — {d.quantity} L
                      </div>
                      <div>
                        <strong>Due:</strong> {formatDateUTC(d.dueDate)}
                      </div>
                      {d.description && (
                        <div>
                          <strong>Note:</strong> {d.description}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {payments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Payments</h3>
                <div className="space-y-2">
                  {payments.map((p, i) => (
                    <Link
                      key={i}
                      to={`/order-summary/${p._id}`}
                      className="block p-3 rounded bg-gray-100 hover:bg-gray-200 transition"
                    >
                      <div>
                        <strong>Code:</strong> {p.code}
                      </div>
                      <div>
                        <strong>Account:</strong> {p.actName}
                      </div>
                      <div>
                        <strong>Amount:</strong> {formatCurrency(p.amount)}
                      </div>
                      <div>
                        <strong>Payment Type:</strong> {p.paymentType}
                      </div>
                      {p.description && (
                        <div>
                          <strong>Note:</strong> {p.description}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminShiftSummaryPage;
