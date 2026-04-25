import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../features/home/pages/Home";
import BookingPage from "../features/bookings/pages/BookingPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";
import Payment from "../features/payments/pages/Payment";
import Refund from "../features/refunds/pages/Refund";
import SeatSelection from "../features/seats/pages/SeatSelection";
import SearchResults from "../features/trips/pages/SearchResults";
import ProfilePage from "../features/users/pages/ProfilePage";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import AdminRoutes from "../features/admin/routes/AdminRoutes";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/trips" element={<SearchResults />} />
        <Route path="/seats/:tripId" element={<SeatSelection />} />
        
        {/* Protected Booking Flow */}
        <Route 
          path="/booking" 
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payment" 
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/refund" element={<Refund />} />
      </Route>
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
