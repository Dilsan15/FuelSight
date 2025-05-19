import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDefPayActs } from "@/Hooks/DefpayactHooks/useDefPayActs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
};

const DefPayForm = ({ formData, setFormData, onNext, onBack }) => {
  const { user } = useAuthContext();
  const { fetchAccounts } = useDefPayActs();

  const [searchQuery, setSearchQuery] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(searchQuery.trim(), 500);
  const [openDeferalPopoverIndex, setOpenDeferalPopoverIndex] = useState(null);
  const [openPaymentPopoverIndex, setOpenPaymentPopoverIndex] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await fetchAccounts(debouncedSearch, 1, 500, "all");
        setAccounts(result.data || []);
      } catch (err) {
        setAccounts([]);
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [debouncedSearch]);

  const addPayment = () => {
    setFormData({
      ...formData,
      payments: [
        ...(formData.payments || []),
        { code: "", amount: "", note: "", paymentType: "QR" },
      ],
    });
  };

  const handleDeferalChange = (i, field, value) => {
    const updated = [...formData.deferals];
    updated[i][field] = value;
    setFormData({ ...formData, deferals: updated });
  };

  const handlePaymentChange = (i, field, value) => {
    const updated = [...formData.payments];
    updated[i][field] = value;
    setFormData({ ...formData, payments: updated });
  };

  const deleteDeferal = (i) => {
    const updated = formData.deferals.filter((_, idx) => idx !== i);
    setFormData({ ...formData, deferals: updated });
  };

  const addDeferal = () => {
    setFormData({
      ...formData,
      deferals: [
        ...(formData.deferals || []),
        { code: "", dueDate: "", description: "", fuelType: "", litres: "" },
      ],
    });
  };

  const deletePayment = (i) => {
    const updated = formData.payments.filter((_, idx) => idx !== i);
    setFormData({ ...formData, payments: updated });
  };

  return (
    <Card className="p-6 space-y-8 bg-gradient-to-br from-[#fefefe] to-[#f5f5f5] border border-gray-300 shadow-xl rounded-xl">
      <CardContent className="space-y-10">
        {/* === Deferals === */}
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Deferal Entries
          </h2>
          {(formData.deferals || []).map((d, i) => {
            const selected = accounts.find((acc) => acc.code === d.code);
            return (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-6 space-y-6"
              >
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <Label className="block mb-2 text-lg font-semibold">
                      Account Code *
                    </Label>
                    <Popover
                      open={openDeferalPopoverIndex === i}
                      onOpenChange={(open) =>
                        setOpenDeferalPopoverIndex(open ? i : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left bg-gray-50 border-gray-300"
                        >
                          {selected
                            ? `${selected.code} - ${selected.firstName || ""} ${
                                selected.lastName || ""
                              } (${selected.address || ""})`
                            : "Select account"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[700px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search by name, code, or address"
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          {loading ? (
                            <div className="p-4 text-sm text-gray-500">
                              Loading accounts...
                            </div>
                          ) : accounts.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">
                              No account found.
                            </div>
                          ) : (
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {accounts.map((acc) => (
                                <CommandItem
                                  key={acc.code}
                                  value={`${acc.code} ${acc.firstName} ${acc.lastName} ${acc.address}`}
                                  onSelect={() => {
                                    handleDeferalChange(i, "code", acc.code);
                                    setOpenDeferalPopoverIndex(null);
                                  }}
                                >
                                  <div className="w-full truncate">
                                    <div className="font-medium">
                                      {acc.code}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {`${acc.firstName || ""} ${
                                        acc.lastName || ""
                                      }`}{" "}
                                      • {acc.address || ""}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={d.dueDate}
                      onChange={(e) =>
                        handleDeferalChange(i, "dueDate", e.target.value)
                      }
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label>Fuel Type *</Label>
                    <Select
                      value={d.fuelType}
                      onValueChange={(val) =>
                        handleDeferalChange(i, "fuelType", val)
                      }
                    >
                      <SelectTrigger className="bg-gray-50 border-gray-300">
                        <SelectValue placeholder="Select Fuel Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          ...new Set(
                            user?.readings?.map((r) => r.fuelType) || []
                          ),
                        ].map((fuel) => (
                          <SelectItem key={fuel} value={fuel}>
                            {fuel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Litres *</Label>
                    <Input
                      type="number"
                      value={d.litres}
                      onChange={(e) =>
                        handleDeferalChange(i, "litres", e.target.value)
                      }
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Description</Label>
                    <Textarea
                      value={d.description}
                      onChange={(e) =>
                        handleDeferalChange(i, "description", e.target.value)
                      }
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => deleteDeferal(i)}
                    >
                      Delete Deferal
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          <Button variant="outline" onClick={addDeferal}>
            Add Deferal
          </Button>
        </div>

        {/* === Payments === */}
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Payment Entries
          </h2>
          {(formData.payments || []).map((p, i) => {
            const selected = accounts.find((acc) => acc.code === p.code);
            return (
              <div
                key={i}
                className="border border-gray-200 bg-white rounded-lg p-6 shadow-md space-y-6"
              >
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <Label className="block mb-2 text-lg font-semibold">
                      Account Code *
                    </Label>
                    <Popover
                      open={openPaymentPopoverIndex === i}
                      onOpenChange={(open) =>
                        setOpenPaymentPopoverIndex(open ? i : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left bg-gray-50 border-gray-300"
                        >
                          {selected
                            ? `${selected.code} - ${selected.firstName || ""} ${
                                selected.lastName || ""
                              } (${selected.address || ""})`
                            : "Select account"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[700px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search by name, code, or address"
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          {loading ? (
                            <div className="p-4 text-sm text-gray-500">
                              Loading accounts...
                            </div>
                          ) : accounts.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">
                              No account found.
                            </div>
                          ) : (
                            <CommandGroup>
                              {accounts.map((acc) => (
                                <CommandItem
                                  key={acc.code}
                                  value={`${acc.code} ${acc.firstName} ${acc.lastName} ${acc.address}`}
                                  onSelect={() => {
                                    handlePaymentChange(i, "code", acc.code);
                                    setOpenPaymentPopoverIndex(null);
                                  }}
                                >
                                  <div className="w-full truncate">
                                    <div className="font-medium">
                                      {acc.code}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {`${acc.firstName || ""} ${
                                        acc.lastName || ""
                                      }`}{" "}
                                      • {acc.address || ""}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div>
                      <Label className="mb-2 block">Payment Method *</Label>
                      <RadioGroup
                        value={p.paymentType}
                        onValueChange={(val) =>
                          handlePaymentChange(i, "paymentType", val)
                        }
                        className="flex gap-6"
                      >
                        {["QR", "Card"].map((method) => (
                          <div
                            key={method}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={method}
                              id={`payment-${i}-${method}`}
                            />
                            <Label
                              htmlFor={`payment-${i}-${method}`}
                              className="text-sm text-gray-800"
                            >
                              {method}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Amount Paid (₹) *</Label>
                      <Input
                        type="number"
                        value={p.amount}
                        onChange={(e) =>
                          handlePaymentChange(i, "amount", e.target.value)
                        }
                        className="bg-gray-50 border-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Note</Label>
                    <Textarea
                      value={p.note}
                      onChange={(e) =>
                        handlePaymentChange(i, "note", e.target.value)
                      }
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => deletePayment(i)}
                    >
                      Delete Payment
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          <Button variant="outline" onClick={addPayment}>
            Add Payment
          </Button>
        </div>

        {/* Navigation Buttons */}
        <div className="pt-6 flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>Next</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DefPayForm;
