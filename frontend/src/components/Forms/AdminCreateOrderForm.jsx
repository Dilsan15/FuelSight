import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useDefPayActs } from "@/Hooks/DefpayactHooks/useDefPayActs";
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";
import { useUsers } from "@/Hooks/AuthHooks/useUsers";
import { useDayRates } from "@/Hooks/DayrateHooks/useDayRates";
import { useCreateDefPayOrder } from "@/Hooks/DefpayorderHooks/useCreateDefPayOrder";
import { useDefPayOrder } from "@/Hooks/DefpayorderHooks/useDefPayOrder";
import { useUpdateDefPayOrder } from "@/Hooks/DefpayorderHooks/useUpdateDefPayOrder";

const AdminCreateOrderForm = () => {
  const { user } = useAuthContext();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { users, isLoading: usersLoading } = useUsers();
  const { fetchAccounts } = useDefPayActs();
  const { createOrder } = useCreateDefPayOrder();
  const { updateOrder } = useUpdateDefPayOrder();
  const { order, fetchOrder } = useDefPayOrder();
  const { dayRates } = useDayRates();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const [selectedPump, setSelectedPump] = useState(null);

  const [form, setForm] = useState({
    userId: "",
    shiftDate: new Date().toISOString().split("T")[0],
    fuelType: "",
    type: "deferal",
    defPayAccount: "",
    code: "",
    actName: "",
    dayRate: "",
    quantity: "",
    dueDate: "",
    paymentType: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await fetchAccounts("", 1, 500, "all");
        setAccounts(result.data || []);
      } catch (err) {
        console.error("Failed to fetch accounts", err);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!isEditMode || !id) return;

    // Always fetch on id change
    fetchOrder(id);
  }, [id, isEditMode]);

  useEffect(() => {
    console.log("Autofilling form with order:", order);
    if (isEditMode && order && users.length > 0) {
      

      setForm((prev) => ({
        ...prev,
        userId: order.user?._id || "",
        defPayAccount: order.defPayAccount?._id || "",
        dayRate: order.dayRate?.toString() || "",
        quantity: order.quantity?.toString() || "",
        amount: order.amount?.toString() || "",
        fuelType: order.fuelType || "",
        paymentType: order.paymentType || "",
        dueDate: order.dueDate?.split("T")[0] || "",
        shiftDate: order.shiftDate?.split("T")[0] || prev.shiftDate,
        type: order.type || "deferal",
        code: order.code || "",
        actName: order.actName || "",
        description: order.description || "",
      }));

      const pump = users.find((u) => u._id === order.user?._id);
      setSelectedPump(pump || null);
    }
  }, [order, users, isEditMode]);

  useEffect(() => {
    if (
      form.type !== "deferal" ||
      !form.fuelType ||
      !form.shiftDate ||
      !dayRates ||
      !dayRates.rates
    )
      return;

    const rate = dayRates.rates[form.fuelType];
    if (rate != null) {
      setForm((prev) => ({
        ...prev,
        dayRate: rate.toString(),
      }));
    }
  }, [form.fuelType, form.shiftDate, form.type, dayRates]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (
        form.type === "payment" &&
        !["QR", "Cash", "Card"].includes(form.paymentType)
      ) {
        alert("Please select a valid payment type.");
        return;
      }

      const amount =
        form.type === "deferal"
          ? Number(form.quantity || 0) * Number(form.dayRate || 0)
          : Number(form.amount || 0);

      const payload = {
        ...form,
        amount,
        quantity:
          form.type === "deferal" ? Number(form.quantity || 0) : undefined,
        user: user._id,
        submittedByName: user.username,
      };

      if (form.type !== "payment") delete payload.paymentType;
      if (form.type !== "deferal") {
        delete payload.dayRate;
        delete payload.dueDate;
        delete payload.fuelType;
        delete payload.quantity;
      }
      if (!payload.status) delete payload.status;

      if (isEditMode) {
        await updateOrder(id, payload);
        alert("Order updated successfully");
      } else {
        await createOrder(payload);
        alert("Order created successfully");
      }

      navigate("/admin-orders");
    } catch (err) {
      console.error("❌ Error submitting order:", err);
      alert("Error submitting order");
    }
  };

  const total =
    form.type === "deferal"
      ? Number(form.quantity || 0) * Number(form.dayRate || 0)
      : null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {isEditMode ? "Edit Order" : "Create New Order"}
      </h1>
      <Card className="p-6 space-y-6">
        <CardContent className="space-y-6">
          {/* Order type */}
          <div>
            <Label>Order Type</Label>
            <Select
              value={form.type}
              onValueChange={(val) => handleChange("type", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deferal">Deferal</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pump select */}
          <div>
            <Label>Pump</Label>
            <Select
              value={form.userId}
              onValueChange={(val) => {
                const pump = users.find((u) => u._id === val);
                handleChange("userId", val);
                setSelectedPump(pump);
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={usersLoading ? "Loading..." : "Select Pump"}
                />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => ["worker"].includes(u.role))
                  .map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.username} – {u.role}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fuel Type (Deferal only) */}
          {form.type === "deferal" && (
            <div>
              <Label>Fuel Type</Label>
              <Select
                value={form.fuelType}
                onValueChange={(val) => handleChange("fuelType", val)}
              >
                <SelectTrigger disabled={!selectedPump}>
                  <SelectValue placeholder="Select Fuel Type" />
                </SelectTrigger>
                <SelectContent>
                  {[...(selectedPump?.readings || []).map((r) => r.fuelType)]
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .map((fuel) => (
                      <SelectItem key={fuel} value={fuel}>
                        {fuel}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Account selection */}
          <div>
            <Label>Account</Label>
            <Popover
              open={accountPopoverOpen}
              onOpenChange={setAccountPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start text-left bg-gray-50 border-gray-300"
                >
                  {form.defPayAccount
                    ? (() => {
                        const acc = accounts.find(
                          (a) => a._id === form.defPayAccount
                        );
                        return acc
                          ? `${acc.code} - ${acc.firstName} ${acc.lastName}`
                          : "Unknown Account";
                      })()
                    : "Select Account"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[600px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search by name, code, or address"
                    value={accountSearch}
                    onValueChange={setAccountSearch}
                  />
                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {accounts
                      .filter((a) =>
                        `${a.code} ${a.firstName} ${a.lastName} ${a.address}`
                          .toLowerCase()
                          .includes(accountSearch.toLowerCase())
                      )
                      .map((acc) => (
                        <CommandItem
                          key={acc._id}
                          onSelect={() => {
                            handleChange("defPayAccount", acc._id);
                            handleChange("code", acc.code);
                            handleChange(
                              "actName",
                              `${acc.firstName || ""} ${
                                acc.lastName || ""
                              }`.trim()
                            );
                            setAccountPopoverOpen(false);
                          }}
                        >
                          <div>
                            <div className="font-medium">{acc.code}</div>
                            <div className="text-xs text-muted-foreground">
                              {acc.firstName} {acc.lastName} • {acc.address}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Quantity + Day Rate (Deferal only) */}
          {form.type === "deferal" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Quantity (L)</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                />
              </div>
              <div>
                <Label>Day Rate (₹/L)</Label>
                <Input
                  type="number"
                  value={form.dayRate}
                  onChange={(e) => handleChange("dayRate", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Due Date (Deferal only) */}
          {form.type === "deferal" && (
            <>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => handleChange("dueDate", e.target.value)}
                />
              </div>
              <div>
                <Label>Total Amount (₹)</Label>
                <div className="border p-2 rounded-md bg-gray-100">
                  ₹ {total?.toFixed(2)}
                </div>
              </div>
            </>
          )}

          {/* Payment-specific fields */}
          {form.type === "payment" && (
            <>
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                />
              </div>

              <div>
                <Label>Payment Type</Label>
                <Select
                  value={form.paymentType}
                  onValueChange={(val) => handleChange("paymentType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["QR", "Cash", "Card"].map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Shift Date */}
          <div>
            <Label>Shift Date</Label>
            <Input
              type="date"
              value={form.shiftDate}
              onChange={(e) => handleChange("shiftDate", e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit Order</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreateOrderForm;
