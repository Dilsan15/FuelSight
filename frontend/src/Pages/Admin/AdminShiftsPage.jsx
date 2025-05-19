import React, { useState } from "react";
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

// Group shifts by calendar date
const groupShiftsByDate = (shifts) => {
  return shifts.reduce((acc, shift) => {
    const dateKey = new Date(shift.shiftDateSubmitted).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(shift);
    return acc;
  }, {});
};

const AdminShiftsPage = () => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(1);

  const { shifts, loading, error } = useShifts({
    start: start || null,
    end: end || null,
  });

  // Group all shifts by date
  const grouped = groupShiftsByDate(shifts);

  // Sort dates in descending order (most recent first)
  const allDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Paginate date groups (10 dates per page)
  const datesPerPage = 10;
  const totalPages = Math.ceil(allDates.length / datesPerPage);
  const paginatedDates = allDates.slice((page - 1) * datesPerPage, page * datesPerPage);

  // Slice grouped shifts to only include those 10 dates
  const groupedPage = paginatedDates.reduce((acc, date) => {
    acc[date] = grouped[date];
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Shift Submissions</h1>

      {/* Filters in a Card */}
      <Card className="p-4">
        <CardContent className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="text-sm block text-gray-700">Start Date</label>
            <Input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setPage(1);
              }}
              className="bg-white max-w-[180px]"
            />
          </div>
          <div>
            <label className="text-sm block text-gray-700">End Date</label>
            <Input
              type="date"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setPage(1);
              }}
              className="bg-white max-w-[180px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading/Error */}
      {loading && <Skeleton className="w-full h-48" />}
      {error && <p className="text-red-600">{error}</p>}

      {/* Accordions per Date */}
      <Accordion type="multiple" className="space-y-4">
        {Object.entries(groupedPage).map(([dateKey, shiftsOnDate]) => (
          <AccordionItem key={dateKey} value={dateKey}>
            <AccordionTrigger className="text-lg font-semibold text-gray-800 bg-gray-50 px-4 py-2 rounded-md hover:bg-gray-100">
              {dateKey}
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {shiftsOnDate.map((shift) => {
                const {
                  _id,
                  submittedByName,
                  timeType,
                  sales,
                  lubeSales = [],
                  readings = [],
                } = shift;

                const totalLubeRevenue = lubeSales.reduce(
                  (sum, l) => sum + (l.amount || 0) * (l.quantity || 0),
                  0
                );

                const totalRevenue =
                  (sales?.cashInHand || 0) +
                  (sales?.cashWithManager || 0) +
                  (sales?.qrTransfer || 0) +
                  (sales?.card || 0) +
                  (sales?.deferralTotal || 0) +
                  totalLubeRevenue;

                const totalFuelSold = readings.reduce((sum, r) => {
                  const open = Number(r.opening) || 0;
                  const close = Number(r.closing) || 0;
                  return sum + (close - open);
                }, 0);

                const futurePayments = sales?.deferralTotal || 0;

                return (
                  <Card key={_id} className="border border-gray-200 shadow-sm">
                    <CardContent className="p-4 flex justify-between flex-wrap gap-4">
                      <div>
                        <h2 className="font-semibold text-gray-800 text-lg">
                          {submittedByName} — {timeType} Shift
                        </h2>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1 text-right min-w-[200px]">
                        <div>Total Revenue: ₹{totalRevenue}</div>
                        <div>Total Fuel Sold: {totalFuelSold} L</div>
                        <div>Future Payments: ₹{futurePayments}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Pagination */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <p className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </p>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default AdminShiftsPage;
