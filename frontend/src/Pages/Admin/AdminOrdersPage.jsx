// AdminOrdersPage.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import { useDefPayOrders } from "@/Hooks/DefpayorderHooks/useDefPayOrders";
import { useDeleteDefPayOrder } from "@/Hooks/DefpayorderHooks/useDeleteDefPayOrder";
import { useNavigate } from "react-router-dom";
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

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
};

const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const { deleteOrder, isDeleting } = useDeleteDefPayOrder();
  const { fetchOrders } = useDefPayOrders();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({
    fuelType: "",
    dueInDays: "",
    paymentType: "",
  });
  const [activeTab, setActiveTab] = useState("creditSale");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const initializedTabs = useRef({ creditSale: true, creditBack: false });

  const debouncedSearch = useDebounce(search, 300);

  const fetchFilteredOrdersCallback = useCallback(async () => {
    setLoading(true);
    try {
      const keywords = [debouncedSearch];
      if (activeTab === "creditSale") {
        if (filter.fuelType) keywords.push(filter.fuelType);
        if (filter.dueInDays) keywords.push(`duein:${filter.dueInDays}`);
      } else if (activeTab === "creditBack") {
        if (filter.paymentType) keywords.push(filter.paymentType);
      }

      const query = keywords.filter(Boolean).join(" ");
      const res = await fetchOrders(query, page);
      const filtered = res.data.filter((o) => o.type === activeTab);
      setOrders(filtered);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setShowSkeletons(false);
    }
  }, [debouncedSearch, page, activeTab, filter.fuelType, filter.dueInDays, filter.paymentType, fetchOrders]);

  useEffect(() => {
    const delay = setTimeout(() => setShowSkeletons(true), 150);
    if (initializedTabs.current[activeTab]) fetchFilteredOrdersCallback();
    return () => clearTimeout(delay);
  }, [fetchFilteredOrdersCallback, activeTab]);



  const handleTabChange = (tab) => {
    setOrders([]);
    setSearch("");
    setPage(1);
    setActiveTab(tab);
    setFilter({ fuelType: "", dueInDays: "", paymentType: "" });
    initializedTabs.current[tab] = true;
  };

  const renderFilters = () => {
    return activeTab === "creditSale" ? (
      <>
        <Select
          onValueChange={(val) =>
            setFilter((prev) => ({
              ...prev,
              fuelType: val === "All" ? "" : val,
            }))
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Fuel Type" />
          </SelectTrigger>
          <SelectContent>
            {["All", "HSD", "MS", "XG"].map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(val) =>
            setFilter((prev) => ({
              ...prev,
              dueInDays: val === "All" ? "" : val,
            }))
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Due in (days)" />
          </SelectTrigger>
          <SelectContent>
            {["All", "7", "15", "30"].map((v) => (
              <SelectItem key={v} value={v}>
                {v === "All" ? "All" : `In ${v} days`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    ) : (
      <Select
        onValueChange={(val) =>
          setFilter((prev) => ({
            ...prev,
            paymentType: val === "All" ? "" : val,
          }))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Payment Type" />
        </SelectTrigger>
        <SelectContent>
          {["All", "QR", "Card", "Cash", "Cheques"].map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderTable = (type) => (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "creditSale" ? "Credit Sales" : "Credit Backs"}
        </CardTitle>
        <CardDescription>
          {type === "creditSale"
            ? "List of all credit sales with their details"
            : "List of all credit backs with their details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Shift Date</TableHead>
                {type === "creditSale" ? (
                  <>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Station</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Type</TableHead>
                  </>
                )}
                <TableHead>Submitted By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && showSkeletons
                ? [...Array(5)].map((_, i) => (
                    <TableRow key={`sk-${type}-${i}`}>
                      {[...Array(type === "creditSale" ? 11 : 8)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : orders.map((order) => (
                    <TableRow
                      key={order._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/order-summary/${order._id}`)}
                    >
                      <TableCell>
                        <span className="font-mono">{order.code}</span>
                      </TableCell>
                      <TableCell>{order.actName}</TableCell>
                      <TableCell>
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A"}
                      </TableCell>
                      {type === "creditSale" ? (
                        <>
                          <TableCell>
                            <Badge variant="outline">{order.fuelType}</Badge>
                          </TableCell>
                          <TableCell>₹{order.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {new Date(order.dueDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {order.user?.stationName || "N/A"}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>₹{order.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.paymentType}</Badge>
                          </TableCell>
                        </>
                      )}
                      <TableCell>{order.submittedByName}</TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/edit-order/${order._id}`);
                            }}
                          >
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isDeleting}
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the order.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    await deleteOrder(order._id);
                                    fetchFilteredOrdersCallback();
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage credit sales and credit backs
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap md:flex-row items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  placeholder="Search by code, name, or submitter..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[240px]"
                />
                {renderFilters()}
              </div>
              <Button onClick={() => navigate("/create-order")}>
                + Create New Order
              </Button>
            </div>

            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="creditSale">Credit Sales</TabsTrigger>
              <TabsTrigger value="creditBack">Credit Backs</TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="creditSale">
          {renderTable("creditSale")}
          <div className="flex justify-between items-center gap-4 mt-4">
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="creditBack">
          {renderTable("creditBack")}
          <div className="flex justify-between items-center gap-4 mt-4">
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOrdersPage;
