import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import Dashboard from '../pages/Dashboard';

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
