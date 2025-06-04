// AdminEditShiftPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useGetShift } from "@/Hooks/ShiftHooks/useShift";
import { useUpdateShift } from "@/Hooks/ShiftHooks/useUpdateShift";
import { getSafePositive, getSafeDecimal } from "@/utils/handleSafeInput";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/utils/formatting";
import { ArrowLeft, Save } from "lucide-react";
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

/* ------------------------------------------------------------------ */

const AdminEditShiftPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shift, loading, error: fetchError, fetchShift } = useGetShift();
  const { updateShift, isUpdating, error: updateError } = useUpdateShift();
  const [form, setForm] = useState({
    submittedByName: "",
    timeType: "",
    date: "",
    sales: {},
    readings: [],
    nozzleTesting: [],
    lubeSales: [],
    dayRate: {},
  });

  /* ------------ fetch / sync ------------ */
  useEffect(() => {
    fetchShift(id);
  }, [id]);

  useEffect(() => {
    if (shift) setForm({ ...shift });
  }, [shift]);

  /* ------------ helpers ------------ */
  const handleChange = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateShift(id, {
        sales: form.sales,
        dayRate: form.dayRate,
        readings: form.readings,
        lubeSales: form.lubeSales,
        nozzleTesting: form.nozzleTesting,
      });
      navigate(`/shift-summary/${id}`);
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------ loading / error states ------------ */
  if (loading || !form) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (fetchError || updateError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">Error: {fetchError || updateError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ------------ quick totals for summary card ------------ */
  const isDataLoaded = shift && Object.keys(form.sales || {}).length > 0;
  
  const totalFuelSold = isDataLoaded ? form.readings.reduce(
    (s, r) => s + (r.closing - r.opening),
    0
  ) : 0;
  
  // Calculate base fuel revenue
  const baseFuelRevenue = isDataLoaded ? form.readings.reduce((s, r) => {
    const rate = +form.dayRate?.[r.fuelType] || 0;
    return s + (r.closing - r.opening) * rate;
  }, 0) : 0;
  
  // Calculate calibration fuel cost to subtract
  const calibrationCost = isDataLoaded ? (form.nozzleTesting || []).reduce((s, t) => {
    const rate = +form.dayRate?.[t.fuelType] || 0;
    const quantity = +t.quantity || 0;
    return s + (quantity * rate);
  }, 0) : 0;
  
  // Net fuel revenue after calibration cost
  const totalRevenue = baseFuelRevenue - calibrationCost;
  
  const totalLubeSales = isDataLoaded ? form.lubeSales.reduce(
    (s, l) => s + (Number(l.amount) || 0),
    0
  ) : 0;

  /* ================================================================== */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ────────── Header ────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Edit Shift</h1>
          <p className="text-gray-600 mt-1">
            {form.user?.stationName} – {form.timeType} Shift
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="gap-2" disabled={isUpdating}>
                <Save className="h-4 w-4" />
                {isUpdating ? "Saving…" : "Save Changes"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Update</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to update this shift?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>
                  Update
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* ────────── Summary Card ────────── */}
      <Card className="bg-gradient-to-br from-background to-muted border shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Shift Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <SummaryItem
              label="Total Fuel Sold"
              value={`${totalFuelSold.toFixed(2)} L`}
            />
            <SummaryItem label="Total Revenue" value={formatINR(totalRevenue)} />
            <SummaryItem label="Lube Sales" value={formatINR(totalLubeSales)} />
          </div>
        </CardContent>
      </Card>

      {/* ────────── Sales Section ────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(form.sales || {}).map(([key, value]) => {
            const lockedKeys = [
              "deferralTotal",
              "advancePaymentTotal",
              "creditSalesTotal",
              "creditBackTotal",
            ];
            const isTotals = lockedKeys.includes(key);
            
            // Format field labels for better display
            const formatLabel = (key) => {
              const labelMap = {
                'cashInHand': 'Cash in Hand',
                'cashWithManager': 'Cash with Manager',
                'qrTransfer': 'QR Transfer',
                'card': 'Card',
                'cheques': 'Cheques',
                'creditSalesTotal': 'Credit Sales Total',
                'creditBackTotal': 'Credit Back Total',
                'lost': 'Lost/Stolen'
              };
              return labelMap[key] || key.replace(/([A-Z])/g, " $1").trim();
            };
            
            return (
              <div key={key} className="space-y-2">
                <Label className="text-sm font-medium">
                  {formatLabel(key)}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={value || ""}
                  disabled={isTotals}
                  readOnly={isTotals}
                  onChange={(e) =>
                    !isTotals &&
                    handleChange("sales", key, getSafeDecimal(e.target.value))
                  }
                  onBlur={(e) => {
                    if (
                      !isTotals &&
                      (e.target.value === "" || +e.target.value < 0)
                    ) {
                      handleChange("sales", key, "0");
                    }
                  }}
                  className={`bg-white border-gray-300 ${
                    isTotals ? "cursor-not-allowed opacity-60" : ""
                  }`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ────────── Day Rates ────────── */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Day Rates (₹/L)
          </CardTitle>
          <CardDescription>
            Modify fuel rates for this shift only. Changes will only affect this shift's calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(form.dayRate || {}).map(([fuelType, rate]) => (
            <div key={fuelType} className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  {fuelType}
                </span>
                Rate (₹/L)
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={rate || ""}
                onChange={(e) =>
                  handleChange("dayRate", fuelType, getSafeDecimal(e.target.value))
                }
                onBlur={(e) => {
                  if (e.target.value === "" || +e.target.value < 0) {
                    handleChange("dayRate", fuelType, "0");
                  }
                }}
                className="bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          ))}
          {Object.keys(form.dayRate || {}).length === 0 && (
            <div className="text-sm text-muted-foreground p-4 bg-gray-50 rounded-lg text-center">
              No day rates available. Day rates will be populated once fuel readings are loaded.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ────────── Fuel Readings ────────── */}
      <FuelReadings
        readings={form.readings || []}
        setForm={setForm}
      />

      {/* ────────── Lube Sales (if any) ────────── */}
      {form.lubeSales?.length > 0 && (
        <LubeSales lubeSales={form.lubeSales} setForm={setForm} />
      )}

      {/* ────────── Linked Orders ────────── */}
      {(form.creditSales?.length > 0 || form.creditBack?.length > 0) && (
        <LinkedOrders sales={form.creditSales} backs={form.creditBack} />
      )}
    </div>
  );
};

/* ===================================================================== */
/* ------------------  sub-components  ------------------------- */

const SummaryItem = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);

const FuelReadings = ({ readings, setForm }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Fuel Readings</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-6">
        {(readings || []).map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg"
          >
            <ReadOnlyField label="Fuel Type" value={r.fuelType} />
            <ReadOnlyField label="Opening Reading" value={r.opening} />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Closing Reading</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={r.closing}
                onChange={(e) => {
                  const updated = [...readings];
                  updated[i].closing = getSafeDecimal(e.target.value);
                  setForm((prev) => ({ ...prev, readings: updated }));
                }}
                onBlur={(e) => {
                  if (e.target.value === "" || +e.target.value < 0) {
                    const updated = [...readings];
                    updated[i].closing = "0";
                    setForm((prev) => ({ ...prev, readings: updated }));
                  }
                }}
                className="bg-white border-gray-300"
              />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const LubeSales = ({ lubeSales, setForm }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Lube Sales</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-6">
        {lubeSales.map((l, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg"
          >
            <TextareaField
              label="Description"
              value={l.description}
              onChange={(val) => {
                const upd = [...lubeSales];
                upd[i].description = val;
                setForm((p) => ({ ...p, lubeSales: upd }));
              }}
            />
            <NumberField
              label="Amount"
              value={l.amount}
              onChange={(val) => {
                const upd = [...lubeSales];
                upd[i].amount = val;
                setForm((p) => ({ ...p, lubeSales: upd }));
              }}
            />
            <NumberField
              label="Quantity"
              value={l.quantity}
              onChange={(val) => {
                const upd = [...lubeSales];
                upd[i].quantity = val;
                setForm((p) => ({ ...p, lubeSales: upd }));
              }}
            />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const LinkedOrders = ({ sales, backs }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Linked Orders</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {sales?.length > 0 && (
          <LinkedGroup title="Credit Sales" items={sales} isBack={false} />
        )}
        {backs?.length > 0 && (
          <LinkedGroup title="Credit Backs" items={backs} isBack />
        )}
      </div>
    </CardContent>
  </Card>
);

const LinkedGroup = ({ title, items, isBack }) => (
  <div className="space-y-3">
    <h3 className="font-medium text-gray-900">{title}</h3>
    <div className="grid gap-3">
      {items.map((o) => (
        <Link
          key={o._id}
          to={`/order-summary/${o._id}`}
          className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <span>
              <span className="text-gray-600">Code:</span>{" "}
              <span className="font-medium">{o.code}</span>
            </span>
            <span>
              <span className="text-gray-600">Amount:</span>{" "}
              <span className="font-medium">{formatINR(o.amount)}</span>
            </span>

            {isBack ? (
              <span>
                <span className="text-gray-600">Type:</span>{" "}
                <span className="font-medium">{o.paymentType}</span>
              </span>
            ) : (
              <>
                <span>
                  <span className="text-gray-600">Fuel:</span>{" "}
                  <span className="font-medium">{o.fuelType}</span>
                </span>
                <span>
                  <span className="text-gray-600">Due:</span>{" "}
                  <span className="font-medium">
                    {new Date(o.dueDate).toLocaleDateString()}
                  </span>
                </span>
              </>
            )}

            {o.description && (
              <span className="col-span-full">
                <span className="text-gray-600">Note:</span>{" "}
                <span className="font-medium">{o.description}</span>
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  </div>
);

const ReadOnlyField = ({ label, value }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    <Input value={value} disabled className="bg-white border-gray-300" />
  </div>
);

const NumberField = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    <Input
      type="number"
      min={0}
      step="any"
      value={value}
      onChange={(e) => onChange(getSafeDecimal(e.target.value))}
      onBlur={(e) => {
        if (e.target.value === "" || +e.target.value < 0) {
          onChange("0");
        }
      }}
      className="bg-white border-gray-300"
    />
  </div>
);

const TextareaField = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white border-gray-300"
    />
  </div>
);

export default AdminEditShiftPage;
