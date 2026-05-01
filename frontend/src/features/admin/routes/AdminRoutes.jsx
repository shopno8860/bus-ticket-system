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
import PageTitle from '../../../components/PageTitle';

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<><PageTitle title="Admin Dashboard" /><Dashboard /></>} />
        <Route path="bus" element={<><PageTitle title="Admin Buses" /><BusPage /></>} />
        <Route path="route" element={<><PageTitle title="Admin Routes" /><RoutePage /></>} />
        <Route path="trip" element={<><PageTitle title="Admin Trips" /><TripPage /></>} />
        <Route path="users" element={<><PageTitle title="Admin Users" /><UsersPage /></>} />
        <Route path="booking" element={<><PageTitle title="Admin Bookings" /><BookingPage /></>} />
        <Route path="payment" element={<><PageTitle title="Admin Payments" /><PaymentPage /></>} />
        <Route path="refund" element={<><PageTitle title="Admin Refunds" /><RefundPage /></>} />

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
