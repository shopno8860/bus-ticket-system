import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../../../layouts/DashboardLayout';
import BookingPage from '../pages/BookingPage';
import BusPage from '../pages/BusPage';
import Dashboard from '../pages/Dashboard';
import PaymentPage from '../pages/PaymentPage';
import RefundPage from '../pages/RefundPage';
import RoutePage from '../pages/RoutePage';
import TripPage from '../pages/TripPage';
import UsersPage from '../pages/UsersPage';
import AdminTripSearch from '../pages/booking/AdminTripSearch';
import AdminSeatSelection from '../pages/booking/AdminSeatSelection';
import AdminBookingSummary from '../pages/booking/AdminBookingSummary';
import AdminBookingConfirm from '../pages/booking/AdminBookingConfirm';
import OperatorsPage from '../pages/OperatorsPage';
import StaffPage from '../pages/StaffPage';
import PageTitle from '../../../components/PageTitle';
import PermissionGate from '../components/PermissionGate';
import { Permission } from '../config/permissions';

function DashboardRoutes() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <>
              <PageTitle title="Dashboard" />
              <Dashboard />
            </>
          }
        />
        <Route
          path="bus"
          element={
            <PermissionGate permission={Permission.MANAGE_BUSES}>
              <PageTitle title="Bus Management" />
              <BusPage />
            </PermissionGate>
          }
        />
        <Route
          path="route"
          element={
            <PermissionGate permission={Permission.MANAGE_ROUTES}>
              <PageTitle title="Route Management" />
              <RoutePage />
            </PermissionGate>
          }
        />
        <Route
          path="trip"
          element={
            <PermissionGate permission={Permission.MANAGE_TRIPS}>
              <PageTitle title="Trip Management" />
              <TripPage />
            </PermissionGate>
          }
        />
        <Route
          path="users"
          element={
            <PermissionGate permission={Permission.MANAGE_USERS}>
              <PageTitle title="User Management" />
              <UsersPage />
            </PermissionGate>
          }
        />
        <Route
          path="operators"
          element={
            <PermissionGate permission={Permission.MANAGE_OPERATORS}>
              <PageTitle title="Operator Management" />
              <OperatorsPage />
            </PermissionGate>
          }
        />
        <Route
          path="staff"
          element={
            <PermissionGate permission={Permission.MANAGE_STAFF}>
              <PageTitle title="Staff Management" />
              <StaffPage />
            </PermissionGate>
          }
        />

        <Route path="booking" element={<Navigate to="search" replace />} />
        <Route
          path="booking/search"
          element={
            <PermissionGate permission={Permission.BOOK_TICKET}>
              <PageTitle title="Book Ticket" />
              <AdminTripSearch />
            </PermissionGate>
          }
        />
        <Route
          path="booking/seats/:tripId"
          element={
            <PermissionGate permission={Permission.BOOK_TICKET}>
              <PageTitle title="Select Seats" />
              <AdminSeatSelection />
            </PermissionGate>
          }
        />
        <Route
          path="booking/summary"
          element={
            <PermissionGate permission={Permission.BOOK_TICKET}>
              <PageTitle title="Booking Summary" />
              <AdminBookingSummary />
            </PermissionGate>
          }
        />
        <Route
          path="booking/confirm"
          element={
            <PermissionGate permission={Permission.BOOK_TICKET}>
              <PageTitle title="Booking Confirmed" />
              <AdminBookingConfirm />
            </PermissionGate>
          }
        />
        <Route
          path="booking/manage"
          element={
            <PermissionGate permission={Permission.MANAGE_BOOKINGS}>
              <PageTitle title="Booking Management" />
              <BookingPage />
            </PermissionGate>
          }
        />

        <Route
          path="payment"
          element={
            <PermissionGate permission={Permission.MANAGE_PAYMENTS}>
              <PageTitle title="Payment Management" />
              <PaymentPage />
            </PermissionGate>
          }
        />
        <Route
          path="refund"
          element={
            <PermissionGate permission={Permission.MANAGE_REFUNDS}>
              <PageTitle title="Refund Management" />
              <RefundPage />
            </PermissionGate>
          }
        />

        <Route path="buses" element={<Navigate to="/dashboard/bus" replace />} />
        <Route path="trips" element={<Navigate to="/dashboard/trip" replace />} />
        <Route path="bookings" element={<Navigate to="/dashboard/booking/manage" replace />} />
        <Route path="payments" element={<Navigate to="/dashboard/payment" replace />} />
        <Route path="refunds" element={<Navigate to="/dashboard/refund" replace />} />
      </Route>
    </Routes>
  );
}

export default DashboardRoutes;
