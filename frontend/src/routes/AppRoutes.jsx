import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../features/home/pages/Home";
import BookingSummary from "../features/bookings/pages/BookingSummary";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import Payment from "../features/payments/pages/Payment";
import Refund from "../features/refunds/pages/Refund";
import SeatSelection from "../features/seats/pages/SeatSelection";
import SearchResults from "../features/trips/pages/SearchResults";
import Profile from "../features/users/pages/Profile";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoutes from "../features/admin/routes/AdminRoutes";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />{" "}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/trips/results" element={<SearchResults />} />
        <Route path="/seats" element={<SeatSelection />} />
        <Route path="/booking/summary" element={<BookingSummary />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/refund" element={<Refund />} />
      </Route>
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
