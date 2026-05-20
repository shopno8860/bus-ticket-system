import { Navigate, Route, Routes } from 'react-router-dom';
import StaffLayout from '../../../layouts/StaffLayout';
import Dashboard from '../pages/Dashboard';
import Booking from '../pages/BookingPage';
import PageTitle from '../../../components/PageTitle';

function StaffRoutes() {
  return (
    <Routes>
      <Route element={<StaffLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<><PageTitle title="Staff Dashboard" /><Dashboard /></>} />
        <Route path="booking" element={<><PageTitle title="Book Ticket" /><Booking /></>} />
      </Route>
    </Routes>
  );
}

export default StaffRoutes;
