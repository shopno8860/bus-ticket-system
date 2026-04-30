import {
  FaBus,
  FaChartPie,
  FaCreditCard,
  FaMapMarkedAlt,
  FaRoute,
  FaTicketAlt,
  FaUndoAlt,
  FaUsers,
} from 'react-icons/fa';

export const adminMenuItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FaChartPie },
  { to: '/admin/bus', label: 'Bus Management', icon: FaBus },
  { to: '/admin/route', label: 'Route Management', icon: FaMapMarkedAlt },
  { to: '/admin/trip', label: 'Trip Management', icon: FaRoute },
  { to: '/admin/booking', label: 'Booking Management', icon: FaTicketAlt },
  { to: '/admin/payment', label: 'Payment Management', icon: FaCreditCard },
  { to: '/admin/refund', label: 'Refund Management', icon: FaUndoAlt },
  { to: '/admin/users', label: 'User Management', icon: FaUsers },
];

export const getAdminPageTitle = (pathname) => {
  const activeItem = adminMenuItems.find((item) => pathname.startsWith(item.to));
  return activeItem?.label ?? 'Admin Dashboard';
};
