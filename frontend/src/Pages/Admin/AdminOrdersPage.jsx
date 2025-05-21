// AdminOrdersPage.jsx
import React, { useEffect, useState, useRef } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDefPayOrders } from "@/Hooks/DefpayorderHooks/useDefPayOrders";
import { useDeleteDefPayOrder } from "@/Hooks/DefpayorderHooks/useDeleteDefPayOrder";
import { useNavigate } from "react-router-dom";

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
    status: "",
    dueInDays: "",
    paymentType: "",
  });
  const [activeTab, setActiveTab] = useState("deferal");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const initializedTabs = useRef({ deferal: true, payment: false });

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const delay = setTimeout(() => setShowSkeletons(true), 150);
    if (initializedTabs.current[activeTab]) fetchFilteredOrders();
    return () => clearTimeout(delay);
  }, [debouncedSearch, page, activeTab, filter]);

  const fetchFilteredOrders = async () => {
    setLoading(true);
    try {
      const keywords = [debouncedSearch];
      if (activeTab === "deferal") {
        if (filter.fuelType) keywords.push(filter.fuelType);
        if (filter.status) keywords.push(filter.status);
        if (filter.dueInDays) keywords.push(`duein:${filter.dueInDays}`);
      } else if (activeTab === "payment") {
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
  };

  const handleTabChange = (tab) => {
    setOrders([]);
    setSearch("");
    setPage(1);
    setActiveTab(tab);
    setFilter({ fuelType: "", status: "", dueInDays: "", paymentType: "" });
    initializedTabs.current[tab] = true;
  };

  const renderFilters = () => {
    return activeTab === "deferal" ? (
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
            setFilter((prev) => ({ ...prev, status: val === "All" ? "" : val }))
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {["All", "unpaid", "partial", "paid"].map((v) => (
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
          {["All", "QR", "Card", "Cash"].map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderTable = (type) => (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <Table className="min-w-full table-fixed divide-y divide-gray-200">
        <TableHeader className="bg-gray-50 text-gray-700 text-sm font-semibold">
          <TableRow>
            <TableHead className="px-4 py-2">Code</TableHead>
            <TableHead className="px-4 py-2">Name</TableHead>
            {type === "deferal" ? (
              <>
                <TableHead className="px-4 py-2">Fuel</TableHead>
                <TableHead className="px-4 py-2">Qty (L)</TableHead>
                <TableHead className="px-4 py-2">Amount</TableHead>
                <TableHead className="px-4 py-2">Due Date</TableHead>
                <TableHead className="px-4 py-2">Station</TableHead>
              </>
            ) : (
              <>
                <TableHead className="px-4 py-2">Amount</TableHead>
                <TableHead className="px-4 py-2">Payment Type</TableHead>
              </>
            )}
            <TableHead className="px-4 py-2">Submitted By</TableHead>
            <TableHead className="px-4 py-2 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-gray-100 text-sm">
          {loading && showSkeletons
            ? [...Array(5)].map((_, i) => (
                <TableRow key={`sk-${type}-${i}`}>
                  {[...Array(type === "deferal" ? 9 : 6)].map((_, j) => (
                    <TableCell key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : orders.map((order, i) => (
                <TableRow
                  key={`${order._id}-${i}`}
                  className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/order-summary/${order._id}`)}
                >
                  <TableCell className="px-4 py-3">{order.code}</TableCell>
                  <TableCell className="px-4 py-3">{order.actName}</TableCell>
                  {type === "deferal" ? (
                    <>
                      <TableCell className="px-4 py-3">
                        {order.fuelType}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {order.quantity}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        ₹{Number(order.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {new Date(order.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{order.user?.stationName || "N/A"}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="px-4 py-3">
                        ₹{Number(order.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {order.paymentType}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="px-4 py-3">
                    {order.submittedByName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
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
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirm = window.confirm("Are you sure?");
                          if (!confirm) return;
                          await deleteOrder(order._id);
                          fetchFilteredOrders();
                        }}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 bg-muted min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Deferral / Payment Orders
        </h1>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <Card>
            <CardContent className="pt-6 pb-4 space-y-4">
              <div className="flex flex-wrap md:flex-row items-center justify-between gap-4">
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

              <TabsList className="w-full justify-start">
                <TabsTrigger value="deferal">Deferals</TabsTrigger>
                <TabsTrigger value="payment">Payments</TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          <TabsContent value="deferal">
            {renderTable("deferal")}
            <div className="flex justify-between items-center gap-4 mt-4 px-1">
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  Prev
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

          <TabsContent value="payment">
            {renderTable("payment")}
            <div className="flex justify-between items-center gap-4 mt-4 px-1">
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  Prev
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
    </div>
  );
};

export default AdminOrdersPage;
