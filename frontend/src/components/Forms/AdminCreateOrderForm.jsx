import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

/* ──────────  ShadCN / UI  ────────── */
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  CommandEmpty,
} from "@/components/ui/command";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

/* ──────────  Hooks  ────────── */
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";
import { useUsers } from "@/Hooks/AuthHooks/useUsers";
import { useDefPayActs } from "@/Hooks/DefpayactHooks/useDefPayActs";
import { useCreateDefPayOrder } from "@/Hooks/DefpayorderHooks/useCreateDefPayOrder";
import { useUpdateDefPayOrder } from "@/Hooks/DefpayorderHooks/useUpdateDefPayOrder";
import { useDefPayOrder } from "@/Hooks/DefpayorderHooks/useDefPayOrder";
import { useDayRates } from "@/Hooks/DayrateHooks/useDayRates"; // 🆕

/* ──────────  Utils  ────────── */
import { getSafeDecimal, formatCurrencyInput } from "@/utils/handleSafeInput.js";

/* ──────────  Defaults  ────────── */
const defaultState = {
  userId: "",
  shiftDate: new Date().toISOString().split("T")[0],
  fuelType: "",
  type: "creditSale",
  defPayAccount: "",
  code: "",
  actName: "",
  dayRate: "",
  quantity: "",
  dueDate: "",
  paymentType: "",
  amount: "",
  description: "",
};

export default function AdminCreateOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  /* hooks */
  const { user } = useAuthContext();
  const { users, isLoading: usersLoading } = useUsers();
  const { fetchAccounts } = useDefPayActs();
  const { createOrder } = useCreateDefPayOrder();
  const { updateOrder } = useUpdateDefPayOrder();
  const { order, fetchOrder } = useDefPayOrder();
  const { dayRates } = useDayRates(); // 🆕

  /* local state */
  const [form, setForm] = useState(defaultState);
  const [accounts, setAccounts] = useState([]);
  const [accSearch, setAccSearch] = useState("");
  const [accPopOpen, setAccPop] = useState(false);
  const [selectedPump, setPump] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [shift, setShift] = useState(null); // used only in edit-mode

  /* helper */
  const handleChange = useCallback((field, val) =>
    setForm((prev) => ({ ...prev, [field]: val })), []);

  const litresDisplay = Number(form.quantity || 0).toFixed(2);

  /* ────────── 1. fetch accounts once ────────── */
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetchAccounts("", 1, 500, "all");
        if (isMounted) {
          setAccounts(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch accounts", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ────────── 2. fetch order when editing ────────── */
  useEffect(() => {
    if (isEditMode && id) fetchOrder(id);
  }, [id, isEditMode]);

  /* ────────── 3. populate form + shift from fetched order ────────── */
  useEffect(() => {
    if (!isEditMode || !order) return;

    setForm((prev) => ({
      ...prev,
      userId: order.user?._id || "",
      defPayAccount: order.defPayAccount?._id || "",
      amount: order.amount?.toString() || "",
      quantity: order.quantity?.toString() || "",
      fuelType: order.fuelType || "",
      paymentType: order.paymentType || "",
      dueDate: order.dueDate?.split("T")[0] || "",
      shiftDate: order.shiftDate?.split("T")[0] || prev.shiftDate,
      type: order.type || "creditSale",
      code: order.code || "",
      actName: order.actName || "",
      description: order.description || "",
      // dayRate is filled in the unified effect below
    }));
    setShift(order.shiftId || null);
    setPump(users.find((u) => u._id === order.user?._id) || null);
  }, [order, users, isEditMode]);

  /* ────────── 4. auto-fill DAY-RATE (only for workers) ────────── */
  useEffect(() => {
    if (form.type !== "creditSale" || !form.fuelType || selectedPump?.role === "admin") return;

    // choose the correct source:   edit-mode → shift.dayRate
    //                              create   → latest dayRates from hook
    const rateSource = isEditMode ? shift?.dayRate : dayRates?.rates;
    if (!rateSource) return;

    const rate = rateSource[form.fuelType];
    if (rate != null && rate.toString() !== form.dayRate) {
      setForm((prev) => ({ ...prev, dayRate: rate.toString() }));
    }
  }, [
    form.type,
    form.fuelType,
    form.dayRate,
    isEditMode,
    shift,
    dayRates,
    selectedPump?.role
  ]);

  /* ────────── 5. compute litres whenever amount/dayRate changes (only for workers) ────────── */
  useEffect(() => {
    if (form.type !== "creditSale" || selectedPump?.role === "admin") return;

    const amt = Number(form.amount || 0);
    const rate = Number(form.dayRate || 0) || 1;
    const litres = amt / rate;

    const newQuantity = litres ? litres.toFixed(2) : "";
    if (newQuantity !== form.quantity) {
      handleChange("quantity", newQuantity);
    }
  }, [form.amount, form.dayRate, form.type, form.quantity, handleChange, selectedPump?.role]);

  /* ────────── 6. submit handler ────────── */
  const handleSubmit = async () => {
    try {
      if (
        form.type === "creditBack" &&
        !["QR", "Cash", "Card"].includes(form.paymentType)
      ) {
        alert("Select a valid payment type.");
        return;
      }
      // Validation
      if (!form.userId || !form.defPayAccount) {
        alert("Pump and account are required.");
        return;
      }
      
      if (!form.amount || Number(form.amount) <= 0) {
        alert("Amount must be greater than 0.");
        return;
      }
      
      if (form.type === "creditSale") {
        // Fuel type only required for worker accounts
        if (selectedPump?.role === "worker" && !form.fuelType) {
          alert("Fuel type is required for worker credit sales.");
          return;
        }
        if (!form.dueDate) {
          alert("Due date is required for credit sales.");
          return;
        }
        // Additional validation for worker accounts
        if (selectedPump?.role === "worker") {
          if (!form.dayRate || Number(form.dayRate) <= 0) {
            alert("Day rate is required for worker orders.");
            return;
          }
          if (!form.quantity || Number(form.quantity) <= 0) {
            alert("Quantity must be calculated and greater than 0.");
            return;
          }
        }
      }

      const payload = {
        // Backend expects these field names for updates
        userId: form.userId,
        accountId: form.defPayAccount,
        type: form.type,
        amount: Number(form.amount || 0),
        submittedByName: user.username,
        description: form.description || "",
        // Always include shift date for updates to find associated shift
        shiftDate: form.shiftDate,
        // Credit sale fields
        ...(form.type === "creditSale" && {
          dueDate: form.dueDate,
          // Only include fuel type and quantity for worker accounts
          ...(selectedPump?.role === "worker" && {
            fuelType: form.fuelType,
            quantity: Number(form.quantity || 0)
          })
        }),
        // Credit back fields
        ...(form.type === "creditBack" && {
          paymentType: form.paymentType
        }),
        // For create mode, also include these fields
        ...(!isEditMode && {
          defPayAccount: form.defPayAccount,
          user: form.userId,
          code: form.code,
          actName: form.actName
        })
      };

      console.log('Submitting payload:', payload);
      
      setSubmitting(true);
      const result = isEditMode ? await updateOrder(id, payload) : await createOrder(payload);
      
      if (result) {
        navigate("/admin-orders");
      } else {
        alert("Failed to create order. Check console for details.");
      }
    } catch (err) {
      console.error("❌ Error submitting order:", err);
      alert("Error submitting order");
    } finally {
      setSubmitting(false);
    }
  };
  /* ────────── 7. UI ────────── */
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card className="shadow-xl bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader className="pb-6 space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isEditMode ? "Edit Order" : "Create New Order"}
          </CardTitle>
          <CardDescription>
            {isEditMode
              ? "Update the order details below."
              : "Create a new credit sale or credit back order."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* ────────── Order Type ────────── */}
          <div>
            <Label>Order Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => handleChange("type", v)}
            >
              <SelectTrigger className="h-11 bg-background">
                <SelectValue placeholder="Select Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creditSale">Credit Sale</SelectItem>
                <SelectItem value="creditBack">Credit Back</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ────────── Pump ────────── */}
          <div>
            <Label>Pump</Label>
            <Select
              value={form.userId}
              onValueChange={(v) => {
                handleChange("userId", v);
                setPump(users.find((u) => u._id === v) || null);
                // Reset fields when pump changes
                if (users.find((u) => u._id === v)?.role === "admin") {
                  handleChange("dayRate", "");
                  handleChange("quantity", "");
                  handleChange("shiftDate", "");
                  handleChange("fuelType", ""); // Clear fuel type for admin
                } else {
                  // Reset fuel type when switching to worker (will be repopulated from their readings)
                  handleChange("fuelType", "");
                }
              }}
            >
              <SelectTrigger className="h-11 bg-background">
                <SelectValue
                  placeholder={usersLoading ? "Loading…" : "Select Pump"}
                />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.username} – {u.stationName} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPump && (
              <div className="text-sm text-muted-foreground mt-1">
                {selectedPump.role === "worker" 
                  ? "Worker account: Will calculate fuel quantity, require fuel type and shift date"
                  : "Admin account: Manual entry without fuel type, quantity or shift date"
                }
              </div>
            )}
          </div>

          {/* ────────── Fuel Type (creditSale and worker only) ────────── */}
          {form.type === "creditSale" && selectedPump?.role === "worker" && (
            <div>
              <Label>Fuel Type</Label>
              <Select
                value={form.fuelType}
                onValueChange={(v) => handleChange("fuelType", v)}
              >
                <SelectTrigger
                  disabled={!selectedPump}
                  className="h-11 bg-background"
                >
                  <SelectValue
                    placeholder={
                      !selectedPump ? "Select a pump first" : "Select Fuel Type"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {[...(selectedPump?.readings || []).map((r) => r.fuelType)]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((fuel) => (
                      <SelectItem key={fuel} value={fuel}>
                        {fuel}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ────────── Account Popover ────────── */}
          <div>
            <Label>Account</Label>
            <Popover open={accPopOpen} onOpenChange={setAccPop}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-11 bg-background"
                >
                  {form.defPayAccount
                    ? (() => {
                        const a = accounts.find(
                          (x) => x._id === form.defPayAccount
                        );
                        return a
                          ? `${a.code} – ${a.firstName} ${a.lastName}`
                          : "Unknown";
                      })()
                    : "Select Account"}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[600px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search by name, code or address…"
                    value={accSearch}
                    onValueChange={setAccSearch}
                    className="h-11"
                  />
                  <CommandEmpty className="p-4 text-sm text-muted-foreground">
                    No accounts found.
                  </CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    {accounts
                      .filter((a) =>
                        `${a.code} ${a.firstName} ${a.lastName} ${a.address}`
                          .toLowerCase()
                          .includes(accSearch.toLowerCase())
                      )
                      .map((a) => (
                        <CommandItem
                          key={a._id}
                          onSelect={() => {
                            handleChange("defPayAccount", a._id);
                            handleChange("code", a.code);
                            handleChange(
                              "actName",
                              `${a.firstName || ""} ${a.lastName || ""}`.trim()
                            );
                            setAccPop(false);
                          }}
                          className="p-3"
                        >
                          <div>
                            <div className="font-medium">{a.code}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.firstName} {a.lastName} • {a.address}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* ────────── creditSale inputs ────────── */}
          {form.type === "creditSale" && (
            <>
              {/* Amount and Day Rate (Day Rate only for workers) */}
              <div className={`grid grid-cols-1 gap-4 ${selectedPump?.role === "worker" ? "md:grid-cols-2" : ""}`}>
                <div>
                  <Label>Amount (₹)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatCurrencyInput(form.amount || "")}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, "");
                      // Only validate format, don't convert to number yet
                      if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                        handleChange("amount", raw);
                      }
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value.replace(/,/g, "");
                      if (raw === "" || Number(raw) < 0) {
                        handleChange("amount", "0");
                      } else if (raw !== "") {
                        // Convert to number and back to string to normalize
                        const num = Number(raw);
                        if (!isNaN(num) && isFinite(num)) {
                          handleChange("amount", num.toString());
                        }
                      }
                    }}
                    className="h-11"
                  />
                </div>
                {selectedPump?.role === "worker" && (
                  <div>
                    <Label>Day Rate (₹/L)</Label>
                    <Input
                      type="text" 
                      inputMode="decimal"
                      defaultValue={form.dayRate || ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d.]/g, "");
                        // Only validate format, don't convert to number yet
                        if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                          handleChange("dayRate", raw);
                        }
                      }}
                      onBlur={(e) => {
                        const raw = e.target.value.replace(/[^\d.]/g, "");
                        if (raw === "" || Number(raw) < 0) {
                          handleChange("dayRate", "0");
                        } else if (raw !== "") {
                          // Convert to number and back to string to normalize
                          const num = Number(raw);
                          if (!isNaN(num) && isFinite(num)) {
                            handleChange("dayRate", num.toString());
                          }
                        }
                      }}
                      className="h-11"
                    />
                  </div>
                )}
              </div>

              {/* Litres and Due Date (Litres only for workers) */}
              <div className={`grid grid-cols-1 gap-4 ${selectedPump?.role === "worker" ? "md:grid-cols-2" : ""}`}>
                {selectedPump?.role === "worker" && (
                  <div>
                    <Label>Litres (calculated)</Label>
                    <div className="h-11 flex items-center px-4 rounded-md bg-muted/50">
                      {litresDisplay} L
                    </div>
                  </div>
                )}
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => handleChange("dueDate", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </>
          )}

          {/* ────────── creditBack inputs ────────── */}
          {form.type === "creditBack" && (
            <>
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatCurrencyInput(form.amount || "")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    // Only validate format, don't convert to number yet
                    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                      handleChange("amount", raw);
                    }
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    if (raw === "" || Number(raw) < 0) {
                      handleChange("amount", "0");
                    } else if (raw !== "") {
                      // Convert to number and back to string to normalize
                      const num = Number(raw);
                      if (!isNaN(num) && isFinite(num)) {
                        handleChange("amount", num.toString());
                      }
                    }
                  }}
                  className="h-11"
                />
              </div>

              <div>
                <Label>Payment Type</Label>
                <Select
                  value={form.paymentType}
                  onValueChange={(v) => handleChange("paymentType", v)}
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["QR", "Cash", "Card"].map((pt) => (
                      <SelectItem key={pt} value={pt}>
                        {pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* ────────── common fields ────────── */}
          {selectedPump?.role === "worker" && (
            <div>
              <Label>Shift Date</Label>
              <Input
                type="date"
                value={form.shiftDate}
                onChange={(e) => handleChange("shiftDate", e.target.value)}
                className="h-11"
              />
            </div>
          )}

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="min-h-[120px] resize-none bg-background"
            />
          </div>

          {/* ────────── controls ────────── */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate("/admin-orders")}
              className="h-11 px-6"
            >
              Cancel
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={submitting}
                  className="h-11 px-6 min-w-[140px]"
                >
                  {submitting
                    ? isEditMode
                      ? "Updating…"
                      : "Creating…"
                    : isEditMode
                    ? "Update Order"
                    : "Create Order"}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Confirm {isEditMode ? "Update" : "Creation"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to {isEditMode ? "update" : "create"}{" "}
                    this order?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    {isEditMode ? "Update" : "Create"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
