import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useShifts } from "@/Hooks/ShiftHooks/useShifts";
import { useDeleteShift } from "@/Hooks/ShiftHooks/useDeleteShift";
import { useNavigate } from "react-router-dom";
import { formatINR } from "@/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { printDailySummary } from "@/utils/printUtils";
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

/* ────────── helpers ────────── */
// group shifts into YYYY-MM-DD buckets (UTC-safe)
const groupShiftsByDate = (shifts) =>
  shifts.reduce((acc, sh) => {
    const d = new Date(sh.shiftDateSubmitted);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getUTCDate()).padStart(2, "0")}`;
    (acc[key] = acc[key] || []).push(sh);
    return acc;
  }, {});

// credit-sale (deferal) amount for one shift
const getShiftCreditAmt = (sh) =>
  sh.creditSales && sh.creditSales.length
    ? sh.creditSales.reduce((t, d) => t + (+d.amount || 0), 0)
    : +sh.sales?.deferralTotal || 0;

// credit-back amount for one shift
const getShiftCreditBackAmt = (sh) =>
  sh.creditBack && sh.creditBack.length
    ? sh.creditBack.reduce((t, p) => t + (+p.amount || 0), 0)
    : +sh.sales?.advancePaymentTotal || 0;

/* ────────── component ────────── */
const AdminShiftsPage = () => {
  /* state */
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  /* data */
  const { shifts, loading, loadingMore, error, hasMore, total, fetchShifts, loadMore } = useShifts({ start, end });
  const { deleteShift } = useDeleteShift();
  const navigate = useNavigate();
  const loaderRef = useRef(null);

  /* group by date */
  const groupedShifts = useMemo(() => {
    const grouped = groupShiftsByDate(shifts);
    const sorted = Object.keys(grouped).sort(
      (a, b) => new Date(b) - new Date(a)
    );
    return Object.fromEntries(sorted.map((d) => [d, grouped[d]]));
  }, [shifts]);

  /* effects */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 1 }
    );
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  /* handlers */
  const handleDelete = async (id) => {
    await deleteShift(id);
    fetchShifts();
  };

  const handleDateChange = (field, value) => {
    if (field === 'start') setStart(value);
    if (field === 'end') setEnd(value);
  };

  /* ────────── render ────────── */
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header + Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Submissions</h1>
          {total > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Showing {shifts.length} of {total} shifts
            </p>
          )}
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-6 items-end">
            {[
              ["Start Date", start, (val) => handleDateChange('start', val)],
              ["End Date", end, (val) => handleDateChange('end', val)],
            ].map(([label, val, setter]) => (
              <div key={label} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <Input
                  type="date"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  className="w-[160px]"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Main Accordion List */}
      {!loading && (
        <Accordion type="multiple" className="space-y-4">
          {Object.entries(groupedShifts).map(([date, shiftsOnDate]) => {
            /* ---- daily aggregates ---- */
            const dailyFuelRevenue = shiftsOnDate.reduce((tot, sh) => {
              const shiftFuel = sh.readings.reduce((s, r) => {
                const rate = +sh.dayRate?.[r.fuelType] || 0;
                return s + (r.closing - r.opening) * rate;
              }, 0);
              
              // Calculate calibration fuel cost for this shift
              const calibrationCost = (sh.nozzleTesting || []).reduce((s, t) => {
                const rate = +sh.dayRate?.[t.fuelType] || 0;
                const quantity = +t.quantity || 0;
                return s + (quantity * rate);
              }, 0);
              
              // Subtract calibration cost from fuel revenue
              return tot + (shiftFuel - calibrationCost);
            }, 0);

            const dailyCreditAmt = shiftsOnDate.reduce(
              (tot, sh) => tot + getShiftCreditAmt(sh),
              0
            );

            const dailyCreditBackAmt = shiftsOnDate.reduce(
              (tot, sh) => tot + getShiftCreditBackAmt(sh),
              0
            );

            // Count credit transactions
            const dailyCreditSalesCount = shiftsOnDate.reduce(
              (tot, sh) => tot + (sh.creditSales?.length || 0),
              0
            );

            const dailyCreditBackCount = shiftsOnDate.reduce(
              (tot, sh) => tot + (sh.creditBack?.length || 0),
              0
            );

            const dailyQR = shiftsOnDate.reduce(
              (tot, sh) => tot + (+sh.sales?.qrTransfer || 0),
              0
            );
            const dailyCard = shiftsOnDate.reduce(
              (tot, sh) => tot + (+sh.sales?.card || 0),
              0
            );
            const dailyCheques = shiftsOnDate.reduce(
              (tot, sh) => tot + (+sh.sales?.cheques || 0),
              0
            );
            const dailyManagerCash = shiftsOnDate.reduce(
              (tot, sh) => tot + (+sh.sales?.cashWithManager || 0),
              0
            );
            const dailyCashInHand = shiftsOnDate.reduce(
              (tot, sh) => tot + (+sh.sales?.cashInHand || 0),
              0
            );

            const dailyLube = shiftsOnDate.reduce(
              (tot, sh) =>
                tot +
                sh.lubeSales.reduce(
                  (s, l) => s + Number(l.amount || 0),
                  0
                ),
              0
            );
            const dailyLost = shiftsOnDate.reduce(
              (tot, sh) => tot + (+sh.sales?.lost || 0),
              0
            );
            
            // Calculate fuel sold by type
            const fuelSoldByType = shiftsOnDate.reduce(
              (acc, sh) => {
                sh.readings.forEach(r => {
                  const quantity = r.closing - r.opening;
                  acc[r.fuelType] = (acc[r.fuelType] || 0) + quantity;
                });
                return acc;
              },
              { MS: 0, HSD: 0, XG: 0 }
            );

            // Calculate daily calibration/testing fuel by type
            const dailyCalibrationFuelByType = shiftsOnDate.reduce(
              (acc, sh) => {
                (sh.nozzleTesting || []).forEach(t => {
                  const quantity = Number(t.quantity || 0);
                  acc[t.fuelType] = (acc[t.fuelType] || 0) + quantity;
                });
                return acc;
              },
              { MS: 0, HSD: 0, XG: 0 }
            );

            // Total fuel sold (for backward compatibility in calculations)
            const fuelLitres = fuelSoldByType.MS + fuelSoldByType.HSD + fuelSoldByType.XG;

            // Total calibration fuel (for backward compatibility)
            const dailyCalibrationFuel = dailyCalibrationFuelByType.MS + dailyCalibrationFuelByType.HSD + dailyCalibrationFuelByType.XG;

            // Calculate net fuel sold (fuel sales - calibration)
            const netFuelSoldByType = {
              MS: fuelSoldByType.MS - dailyCalibrationFuelByType.MS,
              HSD: fuelSoldByType.HSD - dailyCalibrationFuelByType.HSD,
              XG: fuelSoldByType.XG - dailyCalibrationFuelByType.XG
            };

            // TTS = Fuel Revenue + Lube Sales + Credit Back (Total Theoretical Sale)
            const dailyTTS = dailyFuelRevenue + dailyLube + dailyCreditBackAmt;
            
            // Calculate theoretical cash in hand: TTS - QR - Card - Cheques - Manager Cash - Credit Sales - Lost
            const dailyCalculatedCashInHand = dailyTTS - dailyQR - dailyCard - dailyCheques - dailyManagerCash - dailyCreditAmt - dailyLost;
            
            // Calculate total cash: Manager Cash + Cash in Hand
            const dailyTotalCash = dailyManagerCash + dailyCalculatedCashInHand;

            /* ---- accordion item ---- */
            return (
              <AccordionItem key={date} value={date}>
                <AccordionTrigger className="bg-white px-6 py-4 rounded-t-xl border hover:bg-gray-50">
                  <div className="flex justify-between w-full">
                    <span className="font-semibold">
                      {new Date(date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                    <div className="flex gap-8 text-sm text-gray-600">
                      <span>TTS: {formatINR(dailyTTS)}</span>
                      <span>MS: {netFuelSoldByType.MS.toFixed(2)}L</span>
                      <span>HSD: {netFuelSoldByType.HSD.toFixed(2)}L</span>
                      <span>XG: {netFuelSoldByType.XG.toFixed(2)}L</span>
                      <span>Shifts: {shiftsOnDate.length}</span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="border-x border-b bg-gray-50 rounded-b-xl">
                  <div className="p-4 space-y-4">
                    {/* Daily Summary Card */}
                    <Card className="bg-white border shadow-sm rounded-xl">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-lg">Daily Summary</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              printDailySummary(date, shiftsOnDate);
                            }}
                            className="flex items-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="6,9 6,2 18,2 18,9" />
                              <path d="M6,18H4a2,2 0 0,1-2-2v-5a2,2 0 0,1,2-2H20a2,2 0 0,1,2,2v5a2,2 0 0,1-2,2H18" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            Print
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                          {/* Primary Metrics */}
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">TTS</span>
                              <span className="text-lg font-semibold">{formatINR(dailyTTS)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Cash</span>
                              <span className="text-lg font-semibold">{formatINR(dailyTotalCash)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Cash in Hand</span>
                              <span className="text-lg font-semibold">{formatINR(dailyCalculatedCashInHand)}</span>
                            </div>
                          </div>
                          
                          {/* Payment Methods */}
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Manager Cash</span>
                              <span className="text-lg font-semibold">{formatINR(dailyManagerCash)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">QR Transfer</span>
                              <span className="text-lg font-semibold">{formatINR(dailyQR)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Card</span>
                              <span className="text-lg font-semibold">{formatINR(dailyCard)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Cheques</span>
                              <span className="text-lg font-semibold">{formatINR(dailyCheques)}</span>
                            </div>
                          </div>
                          
                          {/* Credit Transactions */}
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Credit Sales</span>
                              <span className="text-lg font-semibold">{formatINR(dailyCreditAmt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Credit Back</span>
                              <span className="text-lg font-semibold">{formatINR(dailyCreditBackAmt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Lost/Stolen</span>
                              <span className="text-lg font-semibold">{formatINR(dailyLost)}</span>
                            </div>
                          </div>
                          
                          {/* Operations */}
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Shifts</span>
                              <span className="text-lg font-semibold">{shiftsOnDate.length}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>



                    {/* Net Fuel Sales Section */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <h5 className="font-medium text-gray-700 mb-2 text-sm">Net Fuel Sales</h5>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 p-2 rounded border border-gray-200">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 font-medium">MS</div>
                            <div className="text-lg font-semibold text-gray-800">{netFuelSoldByType.MS.toFixed(2)} L</div>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded border border-gray-200">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 font-medium">HSD</div>
                            <div className="text-lg font-semibold text-gray-800">{netFuelSoldByType.HSD.toFixed(2)} L</div>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded border border-gray-200">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 font-medium">XG</div>
                            <div className="text-lg font-semibold text-gray-800">{netFuelSoldByType.XG.toFixed(2)} L</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Per-Shift Cards */}
                    <div className="grid gap-4">
                      {shiftsOnDate.map((sh) => {
                        const {
                          _id,
                          timeType,
                          readings,
                          user,
                          submittedByName,
                          dayRate,
                          creditSales = [],
                          nozzleTesting = [],
                          sales = {},
                        } = sh;

                        const fuelRev = readings.reduce((s, r) => {
                          const rate = +dayRate?.[r.fuelType] || 0;
                          return s + (r.closing - r.opening) * rate;
                        }, 0);

                        // Calculate calibration fuel cost for this shift
                        const calibrationCost = nozzleTesting.reduce((s, t) => {
                          const rate = +dayRate?.[t.fuelType] || 0;
                          const quantity = +t.quantity || 0;
                          return s + (quantity * rate);
                        }, 0);

                        // Adjusted fuel revenue (subtract calibration cost)
                        const adjustedFuelRev = fuelRev - calibrationCost;

                        const creditAmt = getShiftCreditAmt(sh);
                        const creditBackAmt = getShiftCreditBackAmt(sh);
                        
                        // Calculate lube sales for this shift
                        const shiftLubeSales = sh.lubeSales?.reduce(
                          (sum, l) => sum + (Number(l.amount) || 0),
                          0
                        ) || 0;
                        
                        // TTS = Fuel Revenue + Lube Sales + Credit Back (Total Theoretical Sale)
                        const shiftTTS = adjustedFuelRev + shiftLubeSales + creditBackAmt;

                        const fuelSoldL = readings.reduce(
                          (s, r) => s + (r.closing - r.opening),
                          0
                        );

                        // Calculate calibration fuel for this shift
                        const calibrationFuelL = nozzleTesting.reduce(
                          (s, t) => s + Number(t.quantity || 0),
                          0
                        );

                        // Calculate total cash for this shift
                        const shiftManagerCash = Number(sales.cashWithManager || 0);
                        const shiftCashInHand = Number(sales.cashInHand || 0);
                        const shiftTotalCash = shiftManagerCash + shiftCashInHand;

                        const creditSalesCount = creditSales ? creditSales.length : 0;
                        const creditBackCount = sh.creditBack ? sh.creditBack.length : 0;

                        return (
                          <Card
                            key={_id}
                            onClick={() => navigate(`/shift-summary/${_id}`)}
                            className="border shadow-sm bg-white hover:bg-gray-50 cursor-pointer transition"
                          >
                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Station & worker */}
                              <div>
                                <p className="font-medium">
                                  {user?.stationName || "Unknown Station"}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {submittedByName} – {timeType}
                                </p>
                              </div>

                              {/* TTS */}
                              <div>
                                <p className="text-sm text-gray-600">TTS</p>
                                <p className="font-medium">
                                  {formatINR(shiftTTS)}
                                </p>
                              </div>

                              {/* Cash Summary */}
                              <div>
                                <p className="text-sm text-gray-600">
                                  Cash Summary
                                </p>
                                <p className="font-medium">
                                  {formatINR(shiftTotalCash)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Digital: {formatINR((Number(sales.qrTransfer || 0) + Number(sales.card || 0) + Number(sales.cheques || 0)))}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/edit-shift/${_id}`);
                                  }}
                                >
                                  Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Are you sure?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the shift
                                        and all associated orders. Account balances will be updated accordingly.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(_id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Infinite-scroll loading indicators */}
      {hasMore && (
        <div ref={loaderRef} className="h-16 flex items-center justify-center">
          {loadingMore ? (
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Loading more shifts...</span>
            </div>
          ) : (
            <div className="text-xs text-gray-400">Scroll to load more</div>
          )}
        </div>
      )}

      {/* End of results indicator */}
      {!loading && !hasMore && shifts.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>You've reached the end of the list</p>
          <p className="text-sm">Total: {total} shifts</p>
        </div>
      )}

      {/* No results */}
      {!loading && shifts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No shifts found</p>
          <p className="text-sm">Try adjusting your date filters or check back later</p>
        </div>
      )}
    </div>
  );
};

export default AdminShiftsPage;
