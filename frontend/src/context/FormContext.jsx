import React, { createContext, useContext, useReducer } from "react";

const FormContext = createContext();

// Initial state
const initialState = {
  shift: {
    submittedByName: "",
    date: new Date().toISOString().split("T")[0],
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
  creditBacks: [],
  errors: {},
  isDirty: false,
};

// Action types
const ACTIONS = {
  UPDATE_SHIFT: "UPDATE_SHIFT",
  UPDATE_SALES: "UPDATE_SALES",
  UPDATE_READINGS: "UPDATE_READINGS",
  UPDATE_CREDIT_SALES: "UPDATE_CREDIT_SALES",
  UPDATE_CREDIT_BACKS: "UPDATE_CREDIT_BACKS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET_FORM: "RESET_FORM",
  SET_DAY_RATES: "SET_DAY_RATES",
  MARK_DIRTY: "MARK_DIRTY",
};

// Reducer
const formReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.UPDATE_SHIFT:
      return {
        ...state,
        shift: {
          ...state.shift,
          ...action.payload,
        },
        isDirty: true,
      };

    case ACTIONS.UPDATE_SALES:
      return {
        ...state,
        shift: {
          ...state.shift,
          sales: {
            ...state.shift.sales,
            ...action.payload,
          },
        },
        isDirty: true,
      };

    case ACTIONS.UPDATE_READINGS:
      return {
        ...state,
        shift: {
          ...state.shift,
          readings: action.payload,
        },
        isDirty: true,
      };

    case ACTIONS.UPDATE_CREDIT_SALES:
      return {
        ...state,
        creditSales: action.payload,
        isDirty: true,
      };

    case ACTIONS.UPDATE_CREDIT_BACKS:
      return {
        ...state,
        creditBacks: action.payload,
        isDirty: true,
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.field]: action.payload.message,
        },
      };

    case ACTIONS.CLEAR_ERROR:
      const newErrors = { ...state.errors };
      delete newErrors[action.payload];
      return {
        ...state,
        errors: newErrors,
      };

    case ACTIONS.RESET_FORM:
      return {
        ...initialState,
        shift: {
          ...initialState.shift,
          date: new Date().toISOString().split("T")[0],
        },
      };

    case ACTIONS.SET_DAY_RATES:
      return {
        ...state,
        shift: {
          ...state.shift,
          dayRate: action.payload,
        },
      };

    case ACTIONS.MARK_DIRTY:
      return {
        ...state,
        isDirty: true,
      };

    default:
      return state;
  }
};

// Provider component
export const FormProvider = ({ children }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const value = {
    state,
    dispatch,
    actions: ACTIONS,
    // Helper functions
    updateShift: (data) =>
      dispatch({ type: ACTIONS.UPDATE_SHIFT, payload: data }),
    updateSales: (data) =>
      dispatch({ type: ACTIONS.UPDATE_SALES, payload: data }),
    updateReadings: (data) =>
      dispatch({ type: ACTIONS.UPDATE_READINGS, payload: data }),
    updateCreditSales: (data) =>
      dispatch({ type: ACTIONS.UPDATE_CREDIT_SALES, payload: data }),
    updateCreditBacks: (data) =>
      dispatch({ type: ACTIONS.UPDATE_CREDIT_BACKS, payload: data }),
    setError: (field, message) =>
      dispatch({
        type: ACTIONS.SET_ERROR,
        payload: { field, message },
      }),
    clearError: (field) =>
      dispatch({ type: ACTIONS.CLEAR_ERROR, payload: field }),
    resetForm: () => dispatch({ type: ACTIONS.RESET_FORM }),
    setDayRates: (rates) =>
      dispatch({ type: ACTIONS.SET_DAY_RATES, payload: rates }),
    markDirty: () => dispatch({ type: ACTIONS.MARK_DIRTY }),
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};

// Custom hook for using the form context
export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useForm must be used within a FormProvider");
  }
  return context;
};

export default FormContext;
