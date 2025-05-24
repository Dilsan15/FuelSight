  // === ShiftPage.jsx ===
  import React, { useState, useEffect, useRef } from "react";
  import { useNavigate } from "react-router-dom";
  import ShiftForm from "@/components/Forms/ShiftForm";
  import DefPayForm from "@/components/Forms/DefPayForm";
  import SalesForm from "@/components/Forms/SalesForm";
  import ReviewForm from "@/components/Forms/ReviewForm";
  import CalcForm from "@/components/Forms/CalcForm";

  import { useDayRates } from "@/Hooks/DayrateHooks/useDayRates";
  import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";
  import { useLogout } from "@/Hooks/AuthHooks/useLogout";
  import { useSubmitShift } from "@/Hooks/ShiftHooks/useSubmitShift";
  import { useDefPayActs } from "@/Hooks/DefpayactHooks/useDefPayActs";

  import { Button } from "@/components/ui/button";
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

  const ShiftPage = () => {
    const [step, setStep] = useState(0);
    const { user } = useAuthContext();
    const { logout } = useLogout();
    const navigate = useNavigate();

    const { dayRates, isLoading: dayRateLoading } = useDayRates();
    const { submitShift, isSubmitting, error } = useSubmitShift();
    const { fetchAccounts } = useDefPayActs();

    const getTodayDate = () => {
      const date = new Date();
      return date.toISOString().split("T")[0];
    };

    const [formData, setFormData] = useState({
      shift: {
        submittedByName: "",
        date: getTodayDate(),
        timeType: "",
        dayRate: { XG: "", HSD: "", MS: "" },
        sales: {
          cashInHand: "",
          cashWithManager: "",
          qrTransfer: "",
          card: "",
          creditSalesTotal: "",
          creditBackTotal: "",
          lost: "0",
        },
        readings: [],
        thrownOutFuel: [],
        lubeSales: [],
      },
      creditSales: [],
      creditBack: [],
    });

    const hasSetRates = useRef(false);

    useEffect(() => {
      if (dayRates && !hasSetRates.current) {
        setFormData((prev) => ({
          ...prev,
          shift: {
            ...prev.shift,
            dayRate: {
              XG: dayRates.rates.XG,
              HSD: dayRates.rates.HSD,
              MS: dayRates.rates.MS,
            },
          },
        }));
        hasSetRates.current = true;
      }
    }, [dayRates]);

    useEffect(() => {
      const isInitial = formData.shift.readings.length === 0;
      const hasUserReadings = user?.readings?.length > 0;

      if (hasUserReadings && isInitial) {
        const defaultReadings = user.readings.map((r) => ({
          fuelType: r.fuelType,
          nozzle: r.nozzle,
          closing: "",
          opening: r.closing,
        }));

        const uniqueFuelTypes = [
          ...new Set(user.readings.map((r) => r.fuelType)),
        ];
        const defaultThrownOutFuel = uniqueFuelTypes.map((fuelType) => ({
          fuelType,
          quantity: "0",
        }));

        setFormData((prev) => ({
          ...prev,
          shift: {
            ...prev.shift,
            readings: defaultReadings,
            thrownOutFuel: defaultThrownOutFuel,
          },
        }));
      }
    }, [user, formData.shift.readings.length]);

    const nextStep = () => setStep((prev) => prev + 1);
    const prevStep = () => setStep((prev) => Math.max(0, prev - 1));

    const updateFormData = (section, delta) => {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...delta,
        },
      }));
    };

    const handleSubmitAll = async (finalData = formData) => {
      try {
        const result = await submitShift({
          shift: finalData.shift,
          creditSales: finalData.creditSales,
          creditBack: finalData.creditBack,
        });
        
        navigate("/");
        return true; // ✅ indicate success
      } catch (err) {
        console.error(err);
        return false; // ✅ indicate failure
      }
    };

    const renderStep = () => {
      switch (step) {
        case 0:
          return (
            <ShiftForm
              formData={formData.shift}
              setFormData={(data) => updateFormData("shift", data)}
              onNext={nextStep}
              isLoading={dayRateLoading}
            />
          );
        case 1:
          return (
            <DefPayForm
              formData={formData}
              setFormData={setFormData}
              onNext={nextStep}
              onBack={prevStep}
              fetchAccounts={fetchAccounts}
            />
          );
        case 2:
          return (
            <SalesForm
              formData={formData.shift}
              setFormData={(data) => updateFormData("shift", data)}
              creditSales={formData.creditSales}
              creditBack={formData.creditBack}
              onNext={nextStep}
              onBack={prevStep}
            />
          );
        case 3:
          return (
            <ReviewForm formData={formData} onBack={prevStep} onNext={nextStep} />
          );
        case 4:
          return (
            <CalcForm
              formData={formData}
              setFormData={setFormData}
              onBack={prevStep}
              onNext={(finalData) => {
                setFormData(finalData);
                handleSubmitAll(finalData);
              }}
            />
          );
        default:
          return null;
      }
    };

    return (
      <div className="w-full min-h-screen relative p-4">
        <div className="absolute top-4 right-4">
          <Button
            onClick={logout}
            className="bg-black text-white hover:bg-gray-800 transition-colors font-semibold py-2 px-4 rounded-md shadow-md"
          >
            Logout
          </Button>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {isSubmitting && (
            <div className="text-blue-600 text-sm font-medium">
              Submitting shift...
            </div>
          )}
          {renderStep()}
        </div>
      </div>
    );
  };

  export default ShiftPage;
