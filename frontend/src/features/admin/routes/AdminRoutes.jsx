import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import BookingsPage from '../pages/BookingsPage';
import BusesPage from '../pages/BusesPage';
import Dashboard from '../pages/Dashboard';
import PaymentsPage from '../pages/PaymentsPage';
import RefundsPage from '../pages/RefundsPage';
import TripsManagementPage from '../pages/TripsManagementPage';
import UsersPage from '../pages/UsersPage';

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="buses" element={<BusesPage />} />
        <Route path="trips" element={<TripsManagementPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="refunds" element={<RefundsPage />} />
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
