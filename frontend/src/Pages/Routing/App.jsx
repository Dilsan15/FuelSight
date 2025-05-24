import { Routes, Route } from "react-router-dom";
import Login from "@/Pages/Login/LoginPage";
import ShiftPage from "@/Pages/ShiftPage/ShiftPage";
import UnauthorizedPage from "@/Pages/Unauthorized/UnauthorizedPage";

import AuthProtectedRoute from "@/Pages/Routing/AuthProtectedRoute";
import AdminProtectedRoute from "@/Pages/Routing/AdminProtectedRoute";
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";
import { Navigate } from "react-router-dom";
import AdminNavbar from "@/components/Nav/AdminNavbar";
import AdminDayRate from "@/Pages/Admin/AdminDayRatePage";
import AdminUsersPage from "@/Pages/Admin/AdminUsersPage";
import CreateUserPage from "@/components/Forms/CreateUserForm";
import AdminPayDefActPage from "@/Pages/Admin/AdminPayDefActPage";
import CreateDefPayActForm from "@/components/Forms/CreateDefActForm";
import AdminOrdersPage from "../Admin/AdminOrdersPage";
import AdminShiftsPage from "../Admin/AdminShiftsPage";
import AdminCreateOrderForm from "../../components/Forms/AdminCreateOrderForm";
import AdminDefPayForm from "../../components/Forms/DefPayForm";
import AdminEditShiftPage from "../../components/Forms/AdminEditShiftPage";
import AdminAccountSummaryPage from "../Admin/AdminAccountSummaryPage";
import AdminOrderSummaryPage from "../Admin/AdminOrderSummaryPage";
import AdminShiftSummaryPage from "../Admin/AdminShiftSummaryPage";

function App() {
  const { user } = useAuthContext();

  return (
    <>
      {user?.role === "admin" && <AdminNavbar />}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<AuthProtectedRoute />}>
          <Route path="/submit-shift" element={<ShiftPage />} nav />
        </Route>

        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin-day-rate" element={<AdminDayRate />} />
          <Route path="/admin-users" element={<AdminUsersPage />} />
          <Route path="/create-user" element={<CreateUserPage />} />
          <Route path="/edit-user/:id" element={<CreateUserPage />} />

          <Route path="/admin-accounts" element={<AdminPayDefActPage />} />
          <Route path="/create-defpayact" element={<CreateDefPayActForm />} />
          <Route path="/edit-defpayact/:id" element={<CreateDefPayActForm />} />
          <Route path="/admin-orders" element={<AdminOrdersPage />} />
          <Route path="/create-order" element={<AdminCreateOrderForm />} />
          <Route path="/edit-order/:id" element={<AdminCreateOrderForm />} />

          <Route path="/create-orders" element={<AdminDefPayForm />} />
          <Route path="/admin-shifts" element={<AdminShiftsPage />} />

          <Route path="/edit-shift/:id" element={<AdminEditShiftPage />} />
          <Route
            path="/account-summary/:id"
            element={<AdminAccountSummaryPage />}
          />
          <Route
            path="/order-summary/:id"
            element={<AdminOrderSummaryPage />}
          />
          <Route
            path="/shift-summary/:id"
            element={<AdminShiftSummaryPage />}
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
