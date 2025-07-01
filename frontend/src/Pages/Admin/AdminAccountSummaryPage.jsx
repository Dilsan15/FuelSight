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
            <div className="grid grid-cols-6 gap-6 px-3 py-2 font-semibold text-muted-foreground text-sm border-b bg-gray-50 rounded-t-lg">
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Code</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-1">By</div>
              <div className="col-span-1"></div>
            </div>
            <div className="space-y-2">
              {account.paymentHistory?.length > 0 ? (
                account.paymentHistory.map((entry, i) => {
                  const order = entry.defPayOrder;
                  if (!order) return null;

                  const isCreditSale = order.type === "creditSale";
                  const badgeClass = isCreditSale
                    ? "bg-blue-500 text-white border-none rounded-full px-3 py-1 flex items-center gap-1 justify-center text-xs font-bold shadow-sm"
                    : "bg-green-500 text-white border-none rounded-full px-3 py-1 flex items-center gap-1 justify-center text-xs font-bold shadow-sm";
                  const badgeIcon = isCreditSale ? (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0A9 9 0 11 3 12a9 9 0 0118 0z" /></svg>
                  ) : (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m0 0l-4-4m4 4l4-4" /></svg>
                  );

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-6 gap-6 items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="col-span-1 flex justify-center">
                        <span className={badgeClass}>
                          {badgeIcon}
                          {isCreditSale ? "Credit Sale" : "Credit Back"}
                        </span>
                      </div>
                      <div className="col-span-1 font-mono">{order.code}</div>
                      <div className="col-span-1 font-medium">
                        ₹{order.amount?.toFixed(2) || "0.00"}
                      </div>
                      <div className="col-span-1">
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString()
                          : "N/A"}
                      </div>
                      <div className="col-span-1">{order.submittedByName}</div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/order-summary/${order._id}`)
                          }
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transaction history available.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <div className="flex justify-center mt-8">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    </div>
  );
};

export default AdminAccountSummaryPage;
