import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateUser } from "@/Hooks/AuthHooks/useCreateUser";
import { useEditUser } from "@/Hooks/AuthHooks/useEditUser";
import { useUsers } from "@/Hooks/AuthHooks/useUsers";
import MultiSelect from "@/components/ui/multiselect";
import {
  getSafePositive,
  getSafeDecimal,
  enforceZeroIfEmpty,
} from "@/utils/handleSafeInput";
import { Icons } from "@/components/ui/icons";

const allFuelTypes = ["XG", "HSD", "MS"];

const CreateUserForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { users, isLoading, error: loadError } = useUsers();
  const { createUser, isCreating, error: createError } = useCreateUser();
  const { editUser, isUpdating, error: updateError } = useEditUser();

  const existingUser = users.find((u) => u._id === id);

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "worker",
    stationName: "",
    isActive: true,
    fuelTypes: [],
    nozzleConfig: {},
    readings: [],
  });

  useEffect(() => {
    if (isEdit && existingUser) {
      const grouped = {};
      existingUser.readings?.forEach((r) => {
        if (!grouped[r.fuelType]) grouped[r.fuelType] = [];
        grouped[r.fuelType].push(r);
      });

      setForm({
        username: existingUser.username || "",
        password: "",
        stationName: existingUser.stationName || "",
        role: existingUser.role || "worker",
        isActive: existingUser.isActive ?? true,
        fuelTypes: Object.keys(grouped),
        nozzleConfig: Object.fromEntries(
          Object.entries(grouped).map(([k, v]) => [k, v.length])
        ),
        readings: existingUser.readings || [],
      });
    }
  }, [existingUser]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFuelSelect = (selected) => {
    const updatedNozzleConfig = { ...form.nozzleConfig };
    selected.forEach((f) => {
      if (!updatedNozzleConfig[f]) updatedNozzleConfig[f] = "";
    });

    const newReadings = selected.flatMap((fuelType) =>
      Array.from({ length: updatedNozzleConfig[fuelType] || 0 }).map((_, i) => {
        const existing = form.readings.find(
          (r) => r.fuelType === fuelType && r.nozzle === i + 1
        );
        return {
          fuelType,
          nozzle: i + 1,
          closing: existing?.closing || "",
        };
      })
    );

    setForm((prev) => ({
      ...prev,
      fuelTypes: selected,
      nozzleConfig: updatedNozzleConfig,
      readings: newReadings,
    }));
  };

  const handleNozzleCountChange = (fuelType, count) => {
    const nozzleCount = parseInt(count) || 0;
    const updatedReadings = [
      ...form.readings.filter((r) => r.fuelType !== fuelType),
      ...Array.from({ length: nozzleCount }).map((_, i) => {
        const existing = form.readings.find(
          (r) => r.fuelType === fuelType && r.nozzle === i + 1
        );
        return {
          fuelType,
          nozzle: i + 1,
          closing: existing?.closing || "",
        };
      }),
    ];

    setForm((prev) => ({
      ...prev,
      nozzleConfig: { ...prev.nozzleConfig, [fuelType]: count },
      readings: updatedReadings,
    }));
  };

  const handleReadingChange = (fuelType, nozzle, value) => {
    const updated = form.readings.map((r) =>
      r.fuelType === fuelType && r.nozzle === nozzle
        ? { ...r, closing: value }
        : r
    );
    setForm((prev) => ({ ...prev, readings: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      readings: form.readings.map((r) => ({
        fuelType: r.fuelType,
        nozzle: r.nozzle,
        closing: Number(r.closing || 0),
      })),
    };

    delete payload.nozzleConfig;
    delete payload.fuelTypes;

    if (isEdit && !form.password) {
      delete payload.password;
    }

    const success = isEdit
      ? await editUser(id, payload)
      : await createUser(payload);

    if (success) navigate("/admin-users");
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-xl border border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {isEdit ? "Edit User" : "Create New User"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEdit
                  ? "Update user information and permissions"
                  : "Add a new user to the system"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Username</Label>
                  <Input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    className="bg-background"
                  />
                </div>

                {!isEdit ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Password</Label>
                    <Input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      className="bg-background"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      New Password (optional)
                    </Label>
                    <Input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Leave blank to keep current"
                      className="bg-background"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Station Name</Label>
                  <Input
                    name="stationName"
                    value={form.stationName}
                    onChange={handleChange}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Role</Label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label className="text-sm font-medium">Active Account</Label>
              </div>

              {form.role === "worker" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Fuel Types</Label>
                    <MultiSelect
                      options={allFuelTypes}
                      value={form.fuelTypes}
                      onChange={handleFuelSelect}
                      placeholder="Select fuel types"
                    />
                  </div>

                  {form.fuelTypes.map((fuelType) => (
                    <Card key={fuelType} className="bg-muted/50">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {fuelType} Configuration
                          </Label>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">
                              Number of Nozzles:
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              step="1"
                              value={form.nozzleConfig[fuelType] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                handleNozzleCountChange(
                                  fuelType,
                                  value
                                );
                              }}
                              onBlur={(e) => {
                                if (
                                  e.target.value === "" ||
                                  Number(e.target.value) < 0
                                ) {
                                  handleNozzleCountChange(fuelType, "");
                                }
                              }}
                              className="w-24 bg-background"
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {form.readings
                            .filter((r) => r.fuelType === fuelType)
                            .sort((a, b) => a.nozzle - b.nozzle)
                            .map((r) => (
                              <div
                                key={`${fuelType}-nozzle-${r.nozzle}`}
                                className="space-y-2"
                              >
                                <Label className="text-sm font-medium">
                                  Nozzle {r.nozzle} - Closing Reading
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={r.closing}
                                  onChange={(e) =>
                                    handleReadingChange(
                                      fuelType,
                                      r.nozzle,
                                      getSafeDecimal(e.target.value)
                                    )
                                  }
                                  onBlur={(e) => {
                                    if (
                                      e.target.value === "" ||
                                      Number(e.target.value) < 0
                                    ) {
                                      handleReadingChange(
                                        fuelType,
                                        r.nozzle,
                                        ""
                                      );
                                    }
                                  }}
                                  className="bg-background"
                                />
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {(createError || updateError) && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icons.warning className="h-4 w-4" />
                    <span>{createError || updateError}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin-users")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="min-w-[100px]"
                >
                  {isEdit
                    ? isUpdating
                      ? "Updating..."
                      : "Update User"
                    : isCreating
                    ? "Creating..."
                    : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUserForm;
