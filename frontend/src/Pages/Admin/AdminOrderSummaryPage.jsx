import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDefPayOrder } from "@/Hooks/DefpayorderHooks/useDefPayOrder";
import { useDeleteDefPayOrder } from "@/Hooks/DefpayorderHooks/useDeleteDefPayOrder";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

const AdminOrderSummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { order, isLoading, error, fetchOrder } = useDefPayOrder(id);
  const { deleteOrder } = useDeleteDefPayOrder();

  useEffect(() => {
    if (id) fetchOrder(id);
  }, [id]);

  const handleDelete = async () => {
    try {
      await deleteOrder(id);
      navigate("/admin-orders");
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <Skeleton className="w-full h-48" />;
  if (!isLoading && error)
    return (
      <div className="p-6 text-red-600">Order not found or failed to load.</div>
    );
  if (!order) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
          <p className="text-muted-foreground">
            View and manage order information
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/edit-order/${id}`)}
          >
            Edit Order
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Order</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  order.
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
            <CardDescription>Basic order details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Order Code
                </div>
                <div className="font-mono text-lg">{order.code}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Type
                </div>
                <Badge
                  variant={
                    order.type === "creditBack" ? "secondary" : "default"
                  }
                >
                  {order.type === "creditBack" ? "Credit Back" : "Credit Sale"}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Account Name
                </div>
                <div className="font-medium">{order.actName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Amount
                </div>
                <div className="text-lg font-bold">
                  ₹{order.amount ? order.amount.toFixed(2) : '0.00'}
                </div>
              </div>
              {order.description && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Description
                  </div>
                  <div className="text-sm">{order.description}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>
              {order.type === "creditBack"
                ? "Credit back payment information"
                : "Credit sale details"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.type === "creditBack" ? (
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Payment Type
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {order.paymentType}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Fuel Type
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {order.fuelType}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Day Rate
                  </div>
                  <div>
                    {order.quantity && order.quantity > 0 && order.amount
                      ? `₹${(order.amount / order.quantity).toFixed(2)}/L`
                      : 'N/A'
                    }
                  </div>
                </div>
                {order.quantity && order.quantity > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Quantity
                    </div>
                    <div>{order.quantity.toFixed(2)} L</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Amount
                  </div>
                  <div className="text-lg font-bold">
                    ₹{order.amount ? order.amount.toFixed(2) : '0.00'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Due Date
                  </div>
                  <div>{new Date(order.dueDate).toLocaleDateString()}</div>
                </div>
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Submitted By
                </div>
                <div>{order.submittedByName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Created At
                </div>
                <div>{new Date(order.createdAt).toLocaleString()}</div>
              </div>
              {order.updatedAt !== order.createdAt && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </div>
                  <div>{new Date(order.updatedAt).toLocaleString()}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOrderSummaryPage;
