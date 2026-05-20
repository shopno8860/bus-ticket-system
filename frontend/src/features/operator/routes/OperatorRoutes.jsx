import { Navigate, Route, Routes } from 'react-router-dom';
import OperatorLayout from '../../../layouts/OperatorLayout';
import Dashboard from '../pages/Dashboard';
import BusManagement from '../pages/BusManagementPage';
import RouteManagement from '../pages/RouteManagementPage';
import TripManagement from '../pages/TripManagementPage';
import Booking from '../pages/BookingPage';
import StaffManagement from '../pages/StaffManagementPage';
import PageTitle from '../../../components/PageTitle';

function OperatorRoutes() {
  return (
    <Routes>
      <Route element={<OperatorLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<><PageTitle title="Operator Dashboard" /><Dashboard /></>} />
        <Route path="bus" element={<><PageTitle title="Bus Management" /><BusManagement /></>} />
        <Route path="route" element={<><PageTitle title="Route Management" /><RouteManagement /></>} />
        <Route path="trip" element={<><PageTitle title="Trip Management" /><TripManagement /></>} />
        <Route path="booking" element={<><PageTitle title="Book Ticket" /><Booking /></>} />
        <Route path="staff" element={<><PageTitle title="Staff Management" /><StaffManagement /></>} />
      </Route>
    </Routes>
  );
}

export default OperatorRoutes;
