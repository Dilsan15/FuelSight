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
import { formatINR } from "@/utils/formatting";
import {
  getSafePositive,
  getSafeDecimal,
  enforceZeroIfEmpty,
  formatCurrencyInput,
} from "@/utils/handleSafeInput";

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

  const [creditSaleSearchQuery, setCreditSaleSearchQuery] = useState("");
  const [creditBackSearchQuery, setCreditBackSearchQuery] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debouncedCreditSaleSearch = useDebounce(creditSaleSearchQuery.trim(), 500);
  const debouncedCreditBackSearch = useDebounce(creditBackSearchQuery.trim(), 500);
  const [openCreditSalePopoverIndex, setOpenCreditSalePopoverIndex] =
    useState(null);
  const [openCreditBackPopoverIndex, setOpenCreditBackPopoverIndex] =
    useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!user?.token) return;
      setLoading(true);
      setError(null);
      try {
        const searchQuery = openCreditSalePopoverIndex !== null 
          ? debouncedCreditSaleSearch 
          : debouncedCreditBackSearch;
        const result = await fetchAccounts(searchQuery, 1, 500, "all");
        if (isMounted) {
          setAccounts(result.data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load accounts:", err);
          setError(err.message || "Failed to load accounts");
          setAccounts([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [debouncedCreditSaleSearch, debouncedCreditBackSearch, user?.token, openCreditSalePopoverIndex, openCreditBackPopoverIndex]);

  // Debug logging
  useEffect(() => {
    console.log('DefPayForm formData:', formData);
  }, [formData]);

  // Helper to generate a unique id
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  const addCreditSale = () => {
    setFormData(prev => ({
      ...prev,
      creditSales: [
        ...(prev.creditSales || []),
        { id: generateId(), code: "", dueDate: "", description: "", fuelType: "", amount: "" },
      ],
      creditBack: prev.creditBack || [],
    }));
  };

  const deleteCreditSale = (id) => {
    setFormData(prev => {
      const updated = (prev.creditSales || []).filter(entry => entry.id !== id);
      return {
        ...prev,
        creditSales: updated,
        creditBack: prev.creditBack || [],
      };
    });
  };

  const handleCreditSaleChange = (id, field, value) => {
    setFormData(prev => {
      const updated = (prev.creditSales || []).map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      );
      return {
        ...prev,
        creditSales: updated,
        creditBack: prev.creditBack || [],
      };
    });
  };

  const addCreditBack = () => {
    setFormData(prev => ({
      ...prev,
      creditBack: [
        ...(prev.creditBack || []),
        { id: generateId(), code: "", amount: "", note: "", paymentType: "QR" },
      ],
      creditSales: prev.creditSales || [],
    }));
  };

  const deleteCreditBack = (id) => {
    setFormData(prev => {
      const updated = (prev.creditBack || []).filter(entry => entry.id !== id);
      return {
        ...prev,
        creditBack: updated,
        creditSales: prev.creditSales || [],
      };
    });
  };

  const handleCreditBackChange = (id, field, value) => {
    setFormData(prev => {
      const updated = (prev.creditBack || []).map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      );
      return {
        ...prev,
        creditBack: updated,
        creditSales: prev.creditSales || [],
      };
    });
  };

  const creditSalesTotal = (formData.creditSales || []).reduce(
    (sum, d) => sum + parseFloat(d.amount || 0),
    0
  );
  const creditBackTotal = (formData.creditBack || []).reduce(
    (sum, d) => sum + parseFloat(d.amount || 0),
    0
  );

  return (
    <Card className="bg-white border border-gray-200 shadow-md rounded-lg">
      <CardContent className="p-6 space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Credit Sale Entries
          </h2>
          {(formData.creditSales || []).map((d) => {
            const selected = accounts.find((acc) => acc.code === d.code);
            return (
              <div
                key={d.id}
                className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 space-y-6"
              >
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <Label className="block mb-2 text-lg font-semibold">
                      Account Code *
                    </Label>
                    <Popover
                      open={openCreditSalePopoverIndex === d.id}
                      onOpenChange={(open) =>
                        setOpenCreditSalePopoverIndex(open ? d.id : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left  hover:bg-sky-500 hover:border-blue-500"
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
                            value={creditSaleSearchQuery}
                            onValueChange={setCreditSaleSearchQuery}
                          />
                          {loading ? (
                            <div className="p-4 text-sm text-gray-500 text-center">
                              Loading accounts...
                            </div>
                          ) : error ? (
                            <div className="p-4 text-sm text-red-500">
                              {error}
                            </div>
                          ) : accounts.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">
                              No accounts found.
                            </div>
                          ) : (
                            <CommandGroup>
                              {accounts.map((acc) => (
                                <CommandItem
                                  key={acc.code}
                                  value={`${acc.code} ${acc.firstName} ${acc.lastName} ${acc.address}`}
                                  onSelect={() => {
                                    handleCreditSaleChange(d.id, "code", acc.code);
                                    setOpenCreditSalePopoverIndex(null);
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label>Due Date (optional)</Label>
                      <Input
                        type="date"
                        value={d.dueDate}
                        onChange={(e) =>
                          handleCreditSaleChange(d.id, "dueDate", e.target.value)
                        }
                        className="bg-gray-50 border-gray-300"
                        placeholder="Leave empty for 15 days default"
                      />
                    </div>

                    <div>
                      <Label>Fuel Type *</Label>
                      <Select
                        value={d.fuelType}
                        onValueChange={(val) =>
                          handleCreditSaleChange(d.id, "fuelType", val)
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
                      <Label>Amount (₹) *</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        value={d.amount || ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, "");
                          console.log('Credit Sale Amount Input:', { raw, processed: getSafeDecimal(raw) });
                          handleCreditSaleChange(
                            d.id,
                            "amount",
                            getSafeDecimal(raw)
                          );
                        }}
                        className="bg-gray-50 border-gray-300"
                        placeholder="Enter amount"
                      />
                    </div>

                    <div>
                      <Label>Litres (calculated)</Label>
                      <Input
                        readOnly
                        value={(
                          parseFloat(d.amount || 0) /
                          parseFloat(
                            formData?.shift?.dayRate?.[d.fuelType] || 1
                          )
                        ).toFixed(2)}
                        className="bg-gray-100 border border-gray-300 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={d.description}
                      onChange={(e) =>
                        handleCreditSaleChange(d.id, "description", e.target.value)
                      }
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => deleteCreditSale(d.id)}
                    >
                      Delete Credit Sale
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          <Button
            variant="outline"
            onClick={addCreditSale}
            className="w-full h-10 px-4 py-2 hover:bg-sky-500 hover:border-blue-500"
          >
            Add Credit Sale
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Credit Back Entries
          </h2>
          {(formData.creditBack || []).map((p) => {
            const selected = accounts.find((acc) => acc.code === p.code);
            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 space-y-6"
              >
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <Label className="block mb-2 text-lg font-semibold">
                      Account Code *
                    </Label>
                    <Popover
                      open={openCreditBackPopoverIndex === p.id}
                      onOpenChange={(open) =>
                        setOpenCreditBackPopoverIndex(open ? p.id : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left  hover:bg-sky-500 hover:border-blue-500"
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
                            value={creditBackSearchQuery}
                            onValueChange={setCreditBackSearchQuery}
                          />
                          {loading ? (
                            <div className="p-4 text-sm text-gray-500 text-center">
                              Loading accounts...
                            </div>
                          ) : error ? (
                            <div className="p-4 text-sm text-red-500">
                              {error}
                            </div>
                          ) : accounts.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">
                              No accounts found.
                            </div>
                          ) : (
                            <CommandGroup>
                              {accounts.map((acc) => (
                                <CommandItem
                                  key={acc.code}
                                  value={`${acc.code} ${acc.firstName} ${acc.lastName} ${acc.address}`}
                                  onSelect={() => {
                                    handleCreditBackChange(p.id, "code", acc.code);
                                    setOpenCreditBackPopoverIndex(null);
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
                          handleCreditBackChange(p.id, "paymentType", val)
                        }
                        className="flex gap-6"
                      >
                        {["QR", "Card", "Cash", "Cheques"].map((method) => (
                          <div
                            key={method}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={method}
                              id={`payment-${p.id}-${method}`}
                            />
                            <Label
                              htmlFor={`payment-${p.id}-${method}`}
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
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        value={p.amount || ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, "");
                          console.log('Credit Back Amount Input:', { raw, processed: getSafeDecimal(raw) });
                          handleCreditBackChange(
                            p.id,
                            "amount",
                            getSafeDecimal(raw)
                          );
                        }}
                        className="bg-gray-50 border-gray-300"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Note</Label>
                    <Textarea
                      value={p.note}
                      onChange={(e) =>
                        handleCreditBackChange(p.id, "note", e.target.value)
                      }
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => deleteCreditBack(p.id)}
                    >
                      Delete Credit Back
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          <Button
            variant="outline"
            onClick={addCreditBack}
            className="w-full h-10 px-4 py-2 hover:bg-sky-500 hover:border-blue-500"
          >
            Add Credit Back
          </Button>
        </div>

        <div className="pt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="h-10 px-4 py-2 hover:bg-sky-500 hover:border-blue-500"
          >
            Back
          </Button>
          <Button
            onClick={onNext}
            className="bg-black text-white hover:bg-gray-900 h-10 px-4 py-2"
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DefPayForm;
