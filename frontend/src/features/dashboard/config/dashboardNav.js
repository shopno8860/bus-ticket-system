import {
  FaBuilding,
  FaBus,
  FaChartPie,
  FaCreditCard,
  FaHandHolding,
  FaMapMarkedAlt,
  FaRoute,
  FaTicketAlt,
  FaUndoAlt,
  FaUserFriends,
  FaUsers,
} from 'react-icons/fa';
import { Permission } from './permissions';

export const dashboardMenuItems = [
  {
    to: '/dashboard/dashboard',
    label: 'Dashboard',
    icon: FaChartPie,
    permissions: [Permission.VIEW_DASHBOARD],
  },
  {
    to: '/dashboard/bus',
    label: 'Bus Management',
    icon: FaBus,
    permissions: [Permission.MANAGE_BUSES],
  },
  {
    to: '/dashboard/route',
    label: 'Route Management',
    icon: FaMapMarkedAlt,
    permissions: [Permission.MANAGE_ROUTES],
  },
  {
    to: '/dashboard/trip',
    label: 'Trip Management',
    icon: FaRoute,
    permissions: [Permission.MANAGE_TRIPS],
  },
  {
    to: '/dashboard/booking',
    label: 'Book Ticket',
    icon: FaHandHolding,
    permissions: [Permission.BOOK_TICKET],
  },
  {
    to: '/dashboard/booking/manage',
    label: 'Booking Management',
    icon: FaTicketAlt,
    permissions: [Permission.MANAGE_BOOKINGS],
  },
  {
    to: '/dashboard/payment',
    label: 'Payment Management',
    icon: FaCreditCard,
    permissions: [Permission.MANAGE_PAYMENTS],
  },
  {
    to: '/dashboard/refund',
    label: 'Refund Management',
    icon: FaUndoAlt,
    permissions: [Permission.MANAGE_REFUNDS],
  },
  {
    to: '/dashboard/operators',
    label: 'Operators',
    icon: FaBuilding,
    permissions: [Permission.MANAGE_OPERATORS],
  },
  {
    to: '/dashboard/users',
    label: 'User Management',
    icon: FaUsers,
    permissions: [Permission.MANAGE_USERS],
  },
  {
    to: '/dashboard/staff',
    label: 'Staff Management',
    icon: FaUserFriends,
    permissions: [Permission.MANAGE_STAFF],
  },
];

export const getDashboardPageTitle = (pathname) => {
  const activeItem = dashboardMenuItems.find((item) =>
    pathname.startsWith(item.to),
  );
  return activeItem?.label ?? 'Dashboard';
};
