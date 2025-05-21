// AdminEditShiftPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useGetShift } from "@/Hooks/ShiftHooks/useShift";
import { useUpdateShift } from "@/Hooks/ShiftHooks/useUpdateShift";

const AdminEditShiftPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shift, loading, error, fetchShift } = useGetShift();
  const { updateShift } = useUpdateShift();
  const [form, setForm] = useState(null);

  useEffect(() => {
    fetchShift(id);
  }, [id]);

  useEffect(() => {
    if (shift) setForm({ ...shift });
  }, [shift]);

  const handleChange = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        sales: form.sales,
        dayRate: form.dayRate,
        readings: form.readings,
        lubeSales: form.lubeSales,
        thrownOutFuel: form.thrownOutFuel,
      };

      await updateShift(id, payload);
      alert("✅ Shift updated");
      navigate("/admin-shifts");
    } catch (err) {
      console.error("Update error", err);
      alert("❌ Failed to update shift");
    }
  };

  if (loading || !form) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Edit Shift</h1>

      {/* SALES */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-semibold">Sales</h2>
          {Object.entries(form.sales).map(([key, value]) => (
            <div key={key}>
              <Label>{key}</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) =>
                  handleChange("sales", key, Number(e.target.value))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* READINGS */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-semibold">Fuel Readings</h2>
          {form.readings.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fuel</Label>
                <Input value={r.fuelType} disabled />
              </div>
              <div>
                <Label>Opening</Label>
                <Input
                  type="number"
                  value={r.opening}
                  onChange={(e) => {
                    const updated = [...form.readings];
                    updated[i].opening = Number(e.target.value);
                    setForm((prev) => ({ ...prev, readings: updated }));
                  }}
                />
              </div>
              <div>
                <Label>Closing</Label>
                <Input
                  type="number"
                  value={r.closing}
                  onChange={(e) => {
                    const updated = [...form.readings];
                    updated[i].closing = Number(e.target.value);
                    setForm((prev) => ({ ...prev, readings: updated }));
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* LUBE SALES */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-semibold">Lube Sales</h2>
          {form.lubeSales.map((l, i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              <div>
                <Label>Description</Label>
                <Textarea
                  value={l.description}
                  onChange={(e) => {
                    const updated = [...form.lubeSales];
                    updated[i].description = e.target.value;
                    setForm((prev) => ({ ...prev, lubeSales: updated }));
                  }}
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={l.amount}
                  onChange={(e) => {
                    const updated = [...form.lubeSales];
                    updated[i].amount = Number(e.target.value);
                    setForm((prev) => ({ ...prev, lubeSales: updated }));
                  }}
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={l.quantity}
                  onChange={(e) => {
                    const updated = [...form.lubeSales];
                    updated[i].quantity = Number(e.target.value);
                    setForm((prev) => ({ ...prev, lubeSales: updated }));
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* LINKED ORDERS (READ-ONLY) */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold">Linked Deferrals & Payments</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <strong>Deferrals:</strong>
              <ul className="ml-4 list-disc">
                {form.deferrals?.map((d) => (
                  <li key={d._id}>
                    Code: {d.code} | Fuel: {d.fuelType} | Qty: {d.quantity} | ₹{d.amount} | Desc:{" "}
                    {d.description || "N/A"} | Due: {new Date(d.dueDate).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Payments:</strong>
              <ul className="ml-4 list-disc">
                {form.payments?.map((p) => (
                  <li key={p._id}>
                    Code: {p.code} | ₹{p.amount} | Type: {p.paymentType} | Desc: {p.description || "N/A"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTIONS */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button onClick={handleSubmit}>Submit Changes</Button>
      </div>
    </div>
  );
};

export default AdminEditShiftPage;
