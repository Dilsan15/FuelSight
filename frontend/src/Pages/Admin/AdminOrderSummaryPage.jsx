import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDefPayOrder } from "@/Hooks/DefpayorderHooks/useDefPayOrder";
import { useDeleteDefPayOrder } from "@/Hooks/DefpayorderHooks/useDeleteDefPayOrder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const AdminOrderSummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { order, fetchOrder, isLoading } = useDefPayOrder();
  const { deleteOrder } = useDeleteDefPayOrder();

  useEffect(() => {
    fetchOrder(id);
  }, [id]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this order?");
    if (!confirmed) return;

    try {
      await deleteOrder(id);
      alert("Order deleted successfully.");
      navigate("/admin-orders");
    } catch (err) {
      alert("Failed to delete order.");
      console.error(err);
    }
  };

  if (isLoading) return <Skeleton className="w-full h-40" />;

  if (!order)
    return <div className="p-6 text-red-600">Order not found or deleted.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-muted min-h-screen text-gray-800">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Order Details – {order.code}</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/edit-order/${id}`)}>
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="pt-6 space-y-3 text-sm">
          <div><strong>Type:</strong> {order.type}</div>
          <div><strong>Account:</strong> {order.actName}</div>
          <div><strong>Amount:</strong> ₹{order.amount}</div>

          {order.type === "payment" && (
            <div><strong>Payment Type:</strong> {order.paymentType}</div>
          )}

          {order.type === "deferal" && (
            <>
              <div><strong>Fuel Type:</strong> {order.fuelType}</div>
              <div><strong>Quantity:</strong> {order.quantity} L</div>
              <div><strong>Due Date:</strong> {new Date(order.dueDate).toLocaleDateString()}</div>
            </>
          )}

          {order.description && (
            <div><strong>Description:</strong> {order.description}</div>
          )}

          <div><strong>Submitted By:</strong> {order.submittedByName}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrderSummaryPage;
