import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import BookingPage from '../pages/BookingPage';
import BusPage from '../pages/BusPage';
import Dashboard from '../pages/Dashboard';
import PaymentPage from '../pages/PaymentPage';
import RefundPage from '../pages/RefundPage';
import RoutePage from '../pages/RoutePage';
import TripPage from '../pages/TripPage';
import UsersPage from '../pages/UsersPage';

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bus" element={<BusPage />} />
        <Route path="route" element={<RoutePage />} />
        <Route path="trip" element={<TripPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="refund" element={<RefundPage />} />

        <Route path="buses" element={<Navigate to="/admin/bus" replace />} />
        <Route path="trips" element={<Navigate to="/admin/trip" replace />} />
        <Route path="bookings" element={<Navigate to="/admin/booking" replace />} />
        <Route path="payments" element={<Navigate to="/admin/payment" replace />} />
        <Route path="refunds" element={<Navigate to="/admin/refund" replace />} />
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
