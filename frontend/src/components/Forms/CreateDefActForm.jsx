import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/ui/icons";

import { useCreateDefPayAct } from "@/Hooks/DefpayactHooks/useCreateDefPayAct";
import { useUpdateDefPayAct } from "@/Hooks/DefpayactHooks/useUpdateDefPayAct";
import { useDefPayAct } from "@/Hooks/DefpayactHooks/useDefPayAct";

const CreateDefPayActForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { createAccount } = useCreateDefPayAct();
  const { updateAccount } = useUpdateDefPayAct();
  const {
    data: existingData,
    loading: loadingData,
    error: loadError,
  } = useDefPayAct(id);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    address: "",
    note: "",
    code: "",
  });

  const [useDefaultCode, setUseDefaultCode] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ⛳ Prefill if editing
  useEffect(() => {
    if (isEdit && existingData) {
      setFormData({
        firstName: existingData.firstName || "",
        lastName: existingData.lastName || "",
        phoneNumber: existingData.phoneNumber || "",
        address: existingData.address || "",
        note: existingData.note || "",
        code: existingData.code || "",
      });
      setUseDefaultCode(!existingData.code); // If there's no custom code, use default
    }
  }, [existingData, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = { ...formData };
      if (useDefaultCode) delete payload.code;

      if (isEdit) {
        await updateAccount(id, payload);
      } else {
        await createAccount(payload);
      }

      navigate("/admin-accounts");
    } catch (err) {
      setError(err?.error || "Failed to save account.");
    } finally {
      setLoading(false);
    }
  };

  if (isEdit && loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icons.spinner className="h-5 w-5 animate-spin" />
          <span>Loading account details...</span>
        </div>
      </div>
    );
  }

  if (isEdit && loadError) {
    return (
      <Card className="max-w-3xl mx-auto mt-10 border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <Icons.warning className="h-5 w-5" />
            <span>Error loading account: {loadError}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-xl border border-gray-200">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isEdit ? "Edit Account" : "Add New Account"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Update the account details below"
              : "Create a new deferred payment account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="firstName">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="lastName">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="phoneNumber">
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="10-digit Indian number"
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="address">
                  Address
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="bg-background"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg">
              <Checkbox
                id="useDefaultCode"
                checked={useDefaultCode}
                onCheckedChange={(checked) => setUseDefaultCode(!!checked)}
              />
              <Label className="text-sm font-medium" htmlFor="useDefaultCode">
                Use default account code
              </Label>
            </div>

            {!useDefaultCode && (
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="code">
                  Custom Code
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="bg-background"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="note">
                Note
              </Label>
              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="bg-background min-h-[100px]"
                placeholder="Add any additional notes about this account..."
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Icons.warning className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin-accounts")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                    <span>{isEdit ? "Updating..." : "Creating..."}</span>
                  </div>
                ) : isEdit ? (
                  "Update Account"
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateDefPayActForm;
