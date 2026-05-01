import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../features/home/pages/Home";
import BookingPage from "../features/bookings/pages/BookingPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import ResetPassword from "../features/auth/pages/ResetPassword";
import Payment from "../features/payments/pages/Payment";
import Refund from "../features/refunds/pages/Refund";
import SeatSelection from "../features/seats/pages/SeatSelection";
import SearchResults from "../features/trips/pages/SearchResults";
import ProfilePage from "../features/users/pages/ProfilePage";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import AdminRoutes from "../features/admin/routes/AdminRoutes";

import PaymentSuccess from "../features/payments/pages/PaymentSuccess";
import PaymentFailed from "../features/payments/pages/PaymentFailed";
import MyTickets from "../features/bookings/pages/MyTickets";
import TicketPage from "../pages/TicketPage";
import PageTitle from "../components/PageTitle";

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes (No Navbar/Footer) */}
      <Route path="/auth/login" element={<><PageTitle title="Login" /><LoginPage /></>} />
      <Route path="/auth/register" element={<><PageTitle title="Register" /><RegisterPage /></>} />
      <Route path="/auth/forgot-password" element={<><PageTitle title="Forgot Password" /><ForgotPassword /></>} />
      <Route path="/auth/reset-password" element={<><PageTitle title="Reset Password" /><ResetPassword /></>} />

      {/* Main Routes (With Navbar/Footer) */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<><PageTitle title="Home" /><Home /></>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <>
                <PageTitle title="Profile" />
                <ProfilePage />
              </>
            </ProtectedRoute>
          }
        />
        <Route path="/trips" element={<><PageTitle title="Trips" /><SearchResults /></>} />
        <Route path="/seats/:tripId" element={
          <ProtectedRoute>
            <>
              <PageTitle title="Seat Selection" />
              <SeatSelection />
            </>
          </ProtectedRoute>
        } />
        
        {/* Protected Booking Flow */}
        <Route 
          path="/booking" 
          element={
            <ProtectedRoute>
              <>
                <PageTitle title="Booking" />
                <BookingPage />
              </>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-tickets" 
          element={
            <ProtectedRoute>
              <>
                <PageTitle title="My Tickets" />
                <MyTickets />
              </>
            </ProtectedRoute>
          } 
        />
        <Route path="/refund" element={<><PageTitle title="Refund" /><Refund /></>} />
      </Route>

      <Route 
        path="/payment" 
        element={
          <ProtectedRoute>
            <>
              <PageTitle title="Payment" />
              <Payment />
            </>
          </ProtectedRoute>
        } 
      />
      <Route path="/payment/success" element={<><PageTitle title="Payment Success" /><PaymentSuccess /></>} />
      <Route path="/payment/failed" element={<><PageTitle title="Payment Failed" /><PaymentFailed /></>} />
      <Route path="/payments/success" element={<><PageTitle title="Payment Success" /><PaymentSuccess /></>} />
      <Route path="/payments/failed" element={<><PageTitle title="Payment Failed" /><PaymentFailed /></>} />
      <Route
        path="/booking/:id"
        element={
          <ProtectedRoute>
            <>
              <PageTitle title="Ticket" />
              <TicketPage />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminRoutes />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
