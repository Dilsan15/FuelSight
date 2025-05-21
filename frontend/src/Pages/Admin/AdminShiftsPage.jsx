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

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(val || 0);

// ✅ UTC-safe date grouping
const groupShiftsByDate = (shifts) => {
  return shifts.reduce((acc, shift) => {
    const d = new Date(shift.shiftDateSubmitted);
    const yyyyMmDd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    acc[yyyyMmDd] = acc[yyyyMmDd] || [];
    acc[yyyyMmDd].push(shift);
    return acc;
  }, {});
};

const AdminShiftsPage = () => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [visibleDatesCount, setVisibleDatesCount] = useState(10);

  const { shifts, loading, error } = useShifts({ start, end });
  const { deleteShift } = useDeleteShift();
  const navigate = useNavigate();
  const loaderRef = useRef(null);

  const groupedShifts = useMemo(() => {
    const grouped = groupShiftsByDate(shifts);
    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b) - new Date(a)
    );
    const visibleDates = sortedDates.slice(0, visibleDatesCount);
    const data = {};
    visibleDates.forEach((date) => {
      data[date] = grouped[date];
    });
    return data;
  }, [shifts, visibleDatesCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleDatesCount((prev) => prev + 10);
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDeleteShift = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    try {
      await deleteShift(id);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to delete shift.");
    }
  };

  return (
    <div className="p-6 space-y-8 bg-muted min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Shift Submissions</h1>

      <Card className="shadow-sm border">
        <CardContent className="flex flex-wrap gap-4 items-end pt-4 pb-2">
          <div className="flex flex-col">
            <label className="text-sm text-gray-700">Start Date</label>
            <Input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setVisibleDatesCount(10);
              }}
              className="bg-white max-w-[160px]"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-700">End Date</label>
            <Input
              type="date"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setVisibleDatesCount(10);
              }}
              className="bg-white max-w-[160px]"
            />
          </div>
        </CardContent>
      </Card>

      {loading && <Skeleton className="w-full h-48" />}
      {error && <p className="text-red-600">{error}</p>}

      <Accordion type="multiple" className="space-y-4">
        {Object.entries(groupedShifts).map(([date, shiftsOnDate]) => {
          const fuel = shiftsOnDate.reduce(
            (s, x) =>
              s + x.readings.reduce((a, r) => a + (r.closing - r.opening), 0),
            0
          );
          const deferrals = shiftsOnDate.reduce(
            (s, x) => s + (x.sales?.deferralTotal || 0),
            0
          );
          const payments = shiftsOnDate.reduce(
            (s, x) => s + (x.sales?.advancePaymentTotal || 0),
            0
          );
          const lube = shiftsOnDate.reduce(
            (s, x) =>
              s + x.lubeSales.reduce((t, l) => t + l.amount * l.quantity, 0),
            0
          );

          return (
            <AccordionItem key={date} value={date}>
              <AccordionTrigger className="bg-white px-4 py-3 font-semibold text-lg hover:bg-gray-100 rounded-t-md">
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </AccordionTrigger>
              <AccordionContent className="space-y-4 bg-gray-50 p-4 rounded-b-md">
                <Card className="bg-white border shadow-sm rounded-md">
                  <CardContent className="p-4 flex flex-wrap justify-between gap-6 text-sm text-gray-700">
                    <div className="space-y-1">
                      <div>
                        <strong>Total Revenue:</strong>{" "}
                        {formatCurrency(payments + deferrals + lube)}
                      </div>
                      <div>
                        <strong>Fuel Sold:</strong> {fuel.toFixed(2)} L
                      </div>
                      <div>
                        <strong>Deferrals:</strong> {formatCurrency(deferrals)}
                      </div>
                      <div>
                        <strong>Payments:</strong> {formatCurrency(payments)}
                      </div>
                      <div>
                        <strong>Lube Sales:</strong> {formatCurrency(lube)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {shiftsOnDate.map((shift) => {
                  const {
                    _id,
                    timeType,
                    sales,
                    readings,
                    lubeSales,
                    user,
                  } = shift;

                  const station = user?.stationName || "Unknown Station";
                  const fuelSold = readings.reduce(
                    (s, r) => s + (r.closing - r.opening),
                    0
                  );
                  const deferral = sales.deferralTotal || 0;
                  const totalPayment = sales.advancePaymentTotal || 0;
                  const lubeAmt = lubeSales.reduce(
                    (s, l) => s + l.amount * l.quantity,
                    0
                  );

                  return (
                    <Card
                      key={_id}
                      className="shadow-sm border bg-white cursor-pointer hover:bg-gray-50 transition rounded-md"
                      onClick={() => navigate(`/shift-summary/${_id}`)}
                    >
                      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {station} — {timeType} Shift
                          </p>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div>
                            Revenue: {formatCurrency(deferral + lubeAmt)}
                          </div>
                          <div>Fuel: {fuelSold.toFixed(2)} L</div>
                          <div>Deferrals: {formatCurrency(deferral)}</div>
                          <div>Payments: {formatCurrency(totalPayment)}</div>
                          <div>Lube: {formatCurrency(lubeAmt)}</div>
                        </div>
                        <div className="flex justify-end items-start gap-2 z-10">
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
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteShift(_id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div ref={loaderRef} className="h-12" />
    </div>
  );
};

export default AdminShiftsPage;
