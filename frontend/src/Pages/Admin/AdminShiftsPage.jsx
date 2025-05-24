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
  const [visibleDatesCount, setVisibleDatesCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  /* data */
  const { shifts, loading, error, fetchShifts } = useShifts({ start, end });
  const { deleteShift } = useDeleteShift();
  const navigate = useNavigate();
  const loaderRef = useRef(null);

  /* filter by search */
  const displayedShifts = useMemo(() => {
    if (!searchTerm) return shifts;
    return shifts.filter((s) =>
      s.submittedByName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shifts, searchTerm]);

  /* group + slice by date */
  const groupedShifts = useMemo(() => {
    const grouped = groupShiftsByDate(displayedShifts);
    const sorted = Object.keys(grouped).sort(
      (a, b) => new Date(b) - new Date(a)
    );
    return Object.fromEntries(
      sorted.slice(0, visibleDatesCount).map((d) => [d, grouped[d]])
    );
  }, [displayedShifts, visibleDatesCount]);

  /* effects */
  useEffect(() => void fetchShifts(), [fetchShifts]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries[0].isIntersecting && setVisibleDatesCount((n) => n + 10),
      { threshold: 1 }
    );
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, []);

  /* handlers */
  const handleDelete = async (id) => {
    await deleteShift(id);
    fetchShifts();
  };

  /* ────────── render ────────── */
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header + Search */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Shift Submissions</h1>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-6 flex flex-wrap gap-6 items-end">
          {[
            ["Start Date", start, setStart],
            ["End Date", end, setEnd],
          ].map(([label, val, setter]) => (
            <div key={label} className="space-y-2">
              <label className="text-sm font-medium">{label}</label>
              <Input
                type="date"
                value={val}
                onChange={(e) => {
                  setter(e.target.value);
                  setVisibleDatesCount(10);
                }}
                className="w-[160px]"
              />
            </div>
          ))}
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
      <Accordion type="multiple" className="space-y-4">
        {Object.entries(groupedShifts).map(([date, shiftsOnDate]) => {
          /* ---- daily aggregates ---- */
          const dailyFuelRevenue = shiftsOnDate.reduce((tot, sh) => {
            const shiftFuel = sh.readings.reduce((s, r) => {
              const rate = +sh.dayRate?.[r.fuelType] || 0;
              return s + (r.closing - r.opening) * rate;
            }, 0);
            return tot + shiftFuel;
          }, 0);

          const dailyCreditAmt = shiftsOnDate.reduce(
            (tot, sh) => tot + getShiftCreditAmt(sh),
            0
          );

          const dailyCreditBackAmt = shiftsOnDate.reduce(
            (tot, sh) => tot + getShiftCreditBackAmt(sh),
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
                (s, l) => s + Number(l.amount) * Number(l.quantity),
                0
              ),
            0
          );
          const dailyLost = shiftsOnDate.reduce(
            (tot, sh) => tot + (+sh.sales?.lost || 0),
            0
          );
          const fuelLitres = shiftsOnDate.reduce(
            (tot, sh) =>
              tot +
              sh.readings.reduce((s, r) => s + (r.closing - r.opening), 0),
            0
          );

          const dailyTTS = dailyFuelRevenue + dailyCreditAmt;

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
                    <span>Fuel: {fuelLitres.toFixed(2)} L</span>
                    <span>Shifts: {shiftsOnDate.length}</span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="border-x border-b bg-gray-50 rounded-b-xl">
                <div className="p-4 space-y-4">
                  {/* Daily Summary Card */}
                  <Card className="bg-white border shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold mb-4">
                        Daily Transaction Summary
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* block 1 */}
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">Fuel Revenue</p>
                          <p className="text-lg font-semibold">
                            {formatINR(dailyFuelRevenue)}
                          </p>
                          <p className="text-sm text-gray-600">Lube Sales</p>
                          <p className="text-lg font-semibold">
                            {formatINR(dailyLube)}
                          </p>
                          <p className="text-sm text-gray-600">Lost / Stolen</p>
                          <p className="text-lg font-semibold text-red-600">
                            -{formatINR(dailyLost)}
                          </p>
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium text-gray-900">
                              Total TTS
                            </p>
                            <p className="text-lg font-semibold">
                              {formatINR(dailyTTS)}
                            </p>
                          </div>
                        </div>
                        {/* block 2 */}
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">
                            Cash w/ Manager
                          </p>
                          <p className="text-lg font-semibold">
                            {formatINR(dailyManagerCash)}
                          </p>
                          <p className="text-sm text-gray-600">QR Transfer</p>
                          <p className="text-lg font-semibold">
                            {formatINR(dailyQR)}
                          </p>
                          <p className="text-sm text-gray-600">Card</p>
                          <p className="text-lg font-semibold">
                            {formatINR(dailyCard)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Credit Sales
                          </p>
                          <p className="text-lg font-semibold">
                            {formatINR(dailyCreditAmt)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Credit Back
                          </p>
                          <p className="text-lg font-semibold">
                            {formatINR(dailyCreditBackAmt)}
                          </p>
                        </div>
                        {/* block 3 */}
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">Total Fuel</p>
                          <p className="text-lg font-semibold">
                            {fuelLitres.toFixed(2)} L
                          </p>
                          <p className="text-sm text-gray-600">
                            Total Shifts
                          </p>
                          <p className="text-lg font-semibold">
                            {shiftsOnDate.length}
                          </p>
                        </div>
                        {/* block 4 */}
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">Cash in Hand</p>
                          <p className="text-lg font-semibold">
                            {formatINR(dailyCashInHand)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

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
                      } = sh;

                      const fuelRev = readings.reduce((s, r) => {
                        const rate = +dayRate?.[r.fuelType] || 0;
                        return s + (r.closing - r.opening) * rate;
                      }, 0);

                      const creditAmt = getShiftCreditAmt(sh);
                      const shiftTTS = fuelRev + creditAmt;

                      const fuelSoldL = readings.reduce(
                        (s, r) => s + (r.closing - r.opening),
                        0
                      );

                      const deferralCount =
                        creditSales && creditSales.length
                          ? creditSales.length
                          : creditAmt > 0
                          ? 1
                          : 0;

                      return (
                        <Card
                          key={_id}
                          onClick={() => navigate(`/shift-summary/${_id}`)}
                          className="border shadow-sm bg-white hover:bg-gray-50 cursor-pointer transition"
                        >
                          <CardContent className="p-4 grid md:grid-cols-4 gap-4">
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

                            {/* Fuel litres */}
                            <div>
                              <p className="text-sm text-gray-600">
                                Fuel Sold
                              </p>
                              <p className="font-medium">
                                {fuelSoldL.toFixed(2)} L
                              </p>
                            </div>

                            {/* Actions & deferal badge */}
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
                                      This will permanently delete the shift.
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

      {/* Infinite-scroll sentinel */}
      <div ref={loaderRef} className="h-12" />
    </div>
  );
};

export default AdminShiftsPage;
