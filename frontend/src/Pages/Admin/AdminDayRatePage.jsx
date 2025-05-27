import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

import { useDayRates } from "@/Hooks/DayrateHooks/useDayRates";
import { useCreateDayRate } from "@/Hooks/DayrateHooks/useCreateDayRates";
import { getSafeDecimal } from "@/utils/handleSafeInput";

const AdminDayRatePage = () => {
  const { dayRates, rateHistory, isLoading, refreshRates } = useDayRates();
  const { createDayRate, isCreating, error } = useCreateDayRate();

  const [rates, setRates] = useState({ XG: "", HSD: "", MS: "" });
  const [submitError, setSubmitError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (dayRates?.rates) {
      setRates(dayRates.rates);
    }
  }, [dayRates]);

  const handleChange = (type, value) => {
    setRates((prev) => ({ ...prev, [type]: value }));
    setSubmitError(""); // Clear any previous errors
  };

  const handleSubmit = async () => {
    // Validate all rates are present and positive
    const hasAllRates = ["XG", "HSD", "MS"].every(
      (type) => rates[type] && Number(rates[type]) > 0
    );

    if (!hasAllRates) {
      setSubmitError("Please enter valid rates for all fuel types");
      return;
    }

    try {
      const success = await createDayRate(rates);
      if (success) {
        await refreshRates(); // Refresh rates after successful creation
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to create day rates");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshRates();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-[250px]" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Fuel Day Rates</h1>
          <p className="text-muted-foreground">
            Set and manage daily fuel rates for credit sales
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={isRefreshing ? "animate-spin" : ""}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Set New Rates</CardTitle>
            <CardDescription>Update fuel rates for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["XG", "HSD", "MS"].map((type) => (
                <div key={type} className="space-y-2">
                  <Label htmlFor={type}>{type} Rate (₹/L)</Label>
                  <Input
                    id={type}
                    type="number"
                    min="0"
                    step="0.01"
                    value={rates[type]}
                    onChange={(e) =>
                      handleChange(type, getSafeDecimal(e.target.value))
                    }
                    className="h-11"
                  />
                </div>
              ))}

              {(submitError || error) && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError || error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmit}
                disabled={isCreating}
                className="w-full h-11"
              >
                {isCreating ? "Setting Rates..." : "Set Rates"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate History</CardTitle>
            <CardDescription>Previous fuel rates by date</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {rateHistory.map((entry) => (
                  <div key={entry._id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">XG</div>
                        <div>₹{entry.rates.XG}/L</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">HSD</div>
                        <div>₹{entry.rates.HSD}/L</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">MS</div>
                        <div>₹{entry.rates.MS}/L</div>
                      </div>
                    </div>
                    {entry.setBy && (
                      <div className="text-xs text-muted-foreground">
                        Set by: {entry.setBy.username}
                      </div>
                    )}
                    <Separator className="my-2" />
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

export default AdminDayRatePage;
