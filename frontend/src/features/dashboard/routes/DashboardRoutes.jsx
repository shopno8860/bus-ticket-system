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
import OperatorOverviewPage from '../pages/OperatorOverviewPage';
import PageTitle from '../../../components/PageTitle';
import PermissionGate from '../components/PermissionGate';
import { Permission } from '../config/permissions';
import OperatorAccessGate from '../components/OperatorAccessGate';
import { OperatorScopeProvider } from '../context/OperatorScopeContext';
import OperatorDetailLayout from '../layouts/OperatorDetailLayout';
import FlatRouteRedirect from '../components/FlatRouteRedirect';
import RoleLandingRedirect from '../components/RoleLandingRedirect';
import { usePermissions } from '../hooks/usePermissions';

function OperatorHubRoutes() {
  return (
    <OperatorScopeProvider>
      <OperatorDetailLayout />
    </OperatorScopeProvider>
  );
}

function DashboardRoutes() {
  const { isAdmin, operatorId } = usePermissions();

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<RoleLandingRedirect />} />
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
            isAdmin ? (
              <PermissionGate permission={Permission.MANAGE_OPERATORS}>
                <PageTitle title="Operator Management" />
                <OperatorsPage />
              </PermissionGate>
            ) : operatorId ? (
              <Navigate to={`/dashboard/operators/${operatorId}`} replace />
            ) : (
              <Navigate to="/dashboard/dashboard" replace />
            )
          }
        />

        <Route path="operators/:operatorId" element={<OperatorAccessGate />}>
          <Route element={<OperatorHubRoutes />}>
            <Route
              index
              element={
                <>
                  <PageTitle title="Operator Overview" />
                  <OperatorOverviewPage />
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
              path="staff"
              element={
                <PermissionGate permission={Permission.MANAGE_STAFF}>
                  <PageTitle title="Staff Management" />
                  <StaffPage />
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
          </Route>
        </Route>

        <Route path="bus" element={<FlatRouteRedirect resource="bus" />} />
        <Route path="route" element={<FlatRouteRedirect resource="route" />} />
        <Route path="trip" element={<FlatRouteRedirect resource="trip" />} />
        <Route path="staff" element={<FlatRouteRedirect resource="staff" />} />
        <Route path="payment" element={<FlatRouteRedirect resource="payment" />} />
        <Route path="refund" element={<FlatRouteRedirect resource="refund" />} />
        <Route
          path="booking/manage"
          element={<FlatRouteRedirect resource="booking/manage" />}
        />
        <Route path="booking" element={<FlatRouteRedirect resource="booking" />} />
        <Route
          path="booking/search"
          element={<FlatRouteRedirect resource="booking/search" />}
        />
        <Route
          path="booking/seats/:tripId"
          element={<FlatRouteRedirect resource="booking/seats" preserveParams />}
        />
        <Route
          path="booking/summary"
          element={<FlatRouteRedirect resource="booking/summary" />}
        />
        <Route
          path="booking/confirm"
          element={<FlatRouteRedirect resource="booking/confirm" />}
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
