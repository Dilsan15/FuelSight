import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDefPayAct } from "@/Hooks/DefpayactHooks/useDefPayAct";
import { useDeleteDefPayAct } from "@/Hooks/DefpayactHooks/useDeleteDefPayAct";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const AdminAccountSummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: account, loading, error } = useDefPayAct(id);
  const { deleteAccount } = useDeleteDefPayAct();

  const handleDelete = async () => {
    try {
      await deleteAccount(id);
      navigate("/admin-accounts");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error)
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    );

  if (!account)
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-yellow-600">No account data found.</div>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Account Details</h1>
          <p className="text-muted-foreground">
            View and manage account information and transaction history
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/edit-account/${id}`)}
          >
            Edit Account
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  this account and all associated transaction history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Account Code
                </div>
                <div className="font-mono text-lg">{account.code}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Balance
                </div>
                <div className="text-lg font-semibold">
                  ₹{account.balance?.toFixed(2)}
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Name
                </div>
                <div>
                  {account.firstName} {account.lastName}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Phone
                </div>
                <div>{account.phoneNumber}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Address
                </div>
                <div>{account.address}</div>
              </div>
              {account.note && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Note
                  </div>
                  <div className="text-sm">{account.note}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Credit Sales
                  </div>
                  <div className="text-2xl font-bold">
                    {account.paymentHistory?.filter(
                      (entry) => entry.defPayOrder?.type === "creditSale"
                    ).length || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Credit Backs
                  </div>
                  <div className="text-2xl font-bold">
                    {account.paymentHistory?.filter(
                      (entry) => entry.defPayOrder?.type === "creditBack"
                    ).length || 0}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {account.paymentHistory?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Type</th>
                      <th className="text-left p-3 font-medium text-gray-600">Code</th>
                      <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left p-3 font-medium text-gray-600">Fuel/Payment</th>
                      <th className="text-right p-3 font-medium text-gray-600">Quantity</th>
                      <th className="text-left p-3 font-medium text-gray-600">Shift Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">DU</th>
                      <th className="text-left p-3 font-medium text-gray-600">Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">Submitted By</th>
                      <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.paymentHistory.map((entry, i) => {
                      const order = entry.defPayOrder;
                      if (!order) return null;

                      return (
                        <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <Badge
                              variant={order.type === "creditSale" ? "secondary" : "default"}
                              className="text-xs"
                            >
                              {order.type === "creditSale" ? "Credit Sale" : "Credit Back"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-sm">{order.code}</span>
                          </td>
                          <td className="p-3 text-right font-medium">
                            ₹{order.amount?.toFixed(2) || "0.00"}
                          </td>
                          <td className="p-3">
                            {order.type === "creditSale" 
                              ? order.fuelType || "N/A"
                              : order.paymentType || "N/A"
                            }
                          </td>
                          <td className="p-3 text-right">
                            {order.type === "creditSale" && order.quantity 
                              ? `${order.quantity} L` 
                              : "-"
                            }
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A"}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              {order.user?.stationName || "N/A"}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              {entry.date ? new Date(entry.date).toLocaleDateString() : "N/A"}
                            </div>
                            {order.type === "creditSale" && order.dueDate && (
                              <div className="text-xs text-gray-500">
                                Due: {new Date(order.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{order.submittedByName}</div>
                            {order.description && (
                              <div className="text-xs text-gray-500 max-w-32 truncate" title={order.description}>
                                {order.description}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs px-2 py-1"
                              onClick={() => navigate(`/order-summary/${order._id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transaction history available.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccountSummaryPage;
