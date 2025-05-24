import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDefPayOrders } from "@/Hooks/DefpayorderHooks/useDefPayOrders";
import { useDefPayActs } from "@/Hooks/DefpayactHooks/useDefPayActs";
import { useUsers } from "@/Hooks/AuthHooks/useUsers";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { fetchOrders } = useDefPayOrders();
  const { fetchAccounts } = useDefPayActs();
  const { users, isLoading: usersLoading } = useUsers();
  const [recentOrders, setRecentOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCreditSales: 0,
    totalCreditBack: 0,
    totalAccounts: 0,
    totalUsers: 0,
    totalOutstanding: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch recent orders
        const ordersRes = await fetchOrders("", 1);
        setRecentOrders(ordersRes.data.slice(0, 5));

        // Fetch accounts
        const accountsRes = await fetchAccounts("", 1, 500, "all");
        setAccounts(accountsRes.data || []);

        // Calculate stats
        const totalOutstanding = accountsRes.data?.reduce(
          (sum, acc) => sum + (acc.balance || 0),
          0
        );
        const creditSales = ordersRes.data.filter(
          (o) => o.type === "creditSale"
        ).length;
        const creditBack = ordersRes.data.filter(
          (o) => o.type === "creditBack"
        ).length;

        setStats({
          totalCreditSales: creditSales,
          totalCreditBack: creditBack,
          totalAccounts: accountsRes.data?.length || 0,
          totalUsers: users.length,
          totalOutstanding,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || usersLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-[300px]" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your petrol pump's credit operations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats.totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalAccounts} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCreditSales}</div>
            <p className="text-xs text-muted-foreground">Total credit sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Backs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCreditBack}</div>
            <p className="text-xs text-muted-foreground">Total credit backs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest credit sales and credit backs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent"
                    onClick={() => navigate(`/order-summary/${order._id}`)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            order.type === "creditBack"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {order.type === "creditBack"
                            ? "Credit Back"
                            : "Credit Sale"}
                        </Badge>
                        <span className="font-mono text-sm">{order.code}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.actName} •{" "}
                        {order.type === "creditBack"
                          ? `₹${order.amount?.toFixed(2)} (${
                              order.paymentType
                            })`
                          : `₹${order.amount?.toFixed(2)} (${
                              order.fuelType
                            } @ ₹${order.dayRate?.toFixed(2)}/L)`}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Outstanding Accounts</CardTitle>
            <CardDescription>
              Accounts with highest outstanding balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <div className="space-y-4">
                {accounts
                  .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                  .slice(0, 5)
                  .map((account) => (
                    <div
                      key={account._id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() =>
                        navigate(`/account-summary/${account._id}`)
                      }
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {account.code}
                          </span>
                          <span className="text-sm font-medium">
                            {account.firstName} {account.lastName}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {account.address}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          ₹{account.balance?.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Outstanding
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
