import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDefPayAct } from "@/Hooks/DefpayactHooks/useDefPayAct";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDeleteDefPayAct } from "@/Hooks/DefpayactHooks/useDeleteDefPayAct";

const AccountSummaryPage = () => {
  const { deleteAccount } = useDeleteDefPayAct();

  const { id } = useParams();
  const navigate = useNavigate();
  const { data: account, loading, error } = useDefPayAct(id);

  if (loading) return <Skeleton className="w-full h-40" />;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!account) return <div className="p-4 text-gray-600">No data found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Account Summary</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/edit-defpayact/${id}`)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const confirmed = window.confirm("Delete this account?");
              if (confirmed) {
                try {
                  await deleteAccount(id);
                  alert("Account deleted successfully.");
                  navigate("/admin-accounts");
                } catch (err) {
                  alert(
                    "Failed to delete account: " +
                      (err.error || "Unknown error")
                  );
                }
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6 text-gray-800">
          <div>
            <strong>Account Code:</strong>{" "}
            <span className="font-mono">{account.code}</span>
          </div>
          <div>
            <strong>Name:</strong> {account.firstName} {account.lastName}
          </div>
          <div>
            <strong>Phone:</strong> {account.phoneNumber}
          </div>
          <div>
            <strong>Address:</strong> {account.address}
          </div>
          <div>
            <strong>Outstanding Amount:</strong> ₹
            {account.balance?.toFixed(2)}
          </div>
          {account.note && (
            <div>
              <strong>Note:</strong> {account.note}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold mb-2">
            Payment / Deferral History
          </h2>

          {account.paymentHistory?.length > 0 ? (
            account.paymentHistory.map((entry, i) => {
              const order = entry.defPayOrder;
              if (!order) return null; // skip null refs

              return (
                <Card
                  key={i}
                  className="bg-white border border-gray-200 shadow-sm"
                >
                  <CardContent className="p-4 space-y-1 text-sm text-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="font-semibold">
                        {order.type === "payment" ? "Payment" : "Deferral"} –{" "}
                        {order.code}
                      </div>
                      <Button
                        size="sm"
                        variant="link"
                        className="text-blue-600"
                        onClick={() => navigate(`/edit-order/${order._id}`)}
                      >
                        View Order
                      </Button>
                    </div>

                    <div>Amount: ₹{order.amount?.toFixed(2) || "0.00"}</div>

                    {/* Optional: Show deferral-specific details */}
                    {order.type === "deferal" && (
                      <>
                        {order.fuelType && (
                          <div>Fuel Type: {order.fuelType}</div>
                        )}
                        {order.quantity && (
                          <div>Quantity: {order.quantity} L</div>
                        )}
                        {order.dueDate && (
                          <div>
                            Due Date:{" "}
                            {new Date(order.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </>
                    )}

                    {/* Optional: Show paymentType if added in future */}
                    {order.type === "payment" && order.paymentType && (
                      <div>Payment Type: {order.paymentType}</div>
                    )}

                    {order.description && (
                      <div>Description: {order.description}</div>
                    )}
                    <div>
                      Date:{" "}
                      {entry.date
                        ? new Date(entry.date).toLocaleDateString()
                        : "N/A"}
                    </div>
                    <div>Submitted By: {order.submittedByName}</div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-gray-500">No payment history available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSummaryPage;
