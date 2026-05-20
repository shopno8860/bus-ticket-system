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

/** Platform-level sidebar items (Super Admin primary navigation). */
export const platformMenuItems = [
  {
    to: '/dashboard/dashboard',
    label: 'Platform Dashboard',
    icon: FaChartPie,
    permissions: [Permission.VIEW_DASHBOARD],
    adminOnly: true,
  },
  {
    to: '/dashboard/operators',
    label: 'Operators',
    icon: FaBuilding,
    permissions: [Permission.MANAGE_OPERATORS],
    adminOnly: true,
  },
  {
    to: '/dashboard/users',
    label: 'User Management',
    icon: FaUsers,
    permissions: [Permission.MANAGE_USERS],
    adminOnly: true,
  },
];

/** Legacy flat operational links — hidden for ADMIN, kept for reference/redirects. */
export const operationalMenuItems = [
  {
    to: '/dashboard/bus',
    label: 'Bus Management',
    icon: FaBus,
    permissions: [Permission.MANAGE_BUSES],
    adminOnly: false,
  },
  {
    to: '/dashboard/route',
    label: 'Route Management',
    icon: FaMapMarkedAlt,
    permissions: [Permission.MANAGE_ROUTES],
    adminOnly: false,
  },
  {
    to: '/dashboard/trip',
    label: 'Trip Management',
    icon: FaRoute,
    permissions: [Permission.MANAGE_TRIPS],
    adminOnly: false,
  },
  {
    to: '/dashboard/booking',
    label: 'Book Ticket',
    icon: FaHandHolding,
    permissions: [Permission.BOOK_TICKET],
    adminOnly: false,
  },
  {
    to: '/dashboard/booking/manage',
    label: 'Booking Management',
    icon: FaTicketAlt,
    permissions: [Permission.MANAGE_BOOKINGS],
    adminOnly: false,
  },
  {
    to: '/dashboard/payment',
    label: 'Payment Management',
    icon: FaCreditCard,
    permissions: [Permission.MANAGE_PAYMENTS],
    adminOnly: false,
  },
  {
    to: '/dashboard/refund',
    label: 'Refund Management',
    icon: FaUndoAlt,
    permissions: [Permission.MANAGE_REFUNDS],
    adminOnly: false,
  },
  {
    to: '/dashboard/staff',
    label: 'Staff Management',
    icon: FaUserFriends,
    permissions: [Permission.MANAGE_STAFF],
    adminOnly: false,
  },
];

export function getDashboardMenuItems({ isAdmin, operatorId }) {
  const platform = platformMenuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    return true;
  });

  if (isAdmin) {
    return platform;
  }

  if (operatorId) {
    return [
      {
        to: `/dashboard/operators/${operatorId}`,
        label: 'My Company',
        icon: FaBuilding,
        permissions: [Permission.VIEW_DASHBOARD],
        adminOnly: false,
      },
    ];
  }

  return [
    {
      to: '/dashboard/dashboard',
      label: 'Dashboard',
      icon: FaChartPie,
      permissions: [Permission.VIEW_DASHBOARD],
      adminOnly: false,
    },
  ];
}

/** @deprecated Use getDashboardMenuItems */
export const dashboardMenuItems = [...platformMenuItems, ...operationalMenuItems];

export const getDashboardPageTitle = (pathname, operatorName) => {
  if (pathname.includes('/dashboard/operators/') && operatorName) {
    if (pathname.endsWith('/bus')) return `${operatorName} — Buses`;
    if (pathname.endsWith('/route')) return `${operatorName} — Routes`;
    if (pathname.endsWith('/trip')) return `${operatorName} — Trips`;
    if (pathname.includes('/booking')) return `${operatorName} — Bookings`;
    if (pathname.endsWith('/payment')) return `${operatorName} — Payments`;
    if (pathname.endsWith('/refund')) return `${operatorName} — Refunds`;
    if (pathname.endsWith('/staff')) return `${operatorName} — Staff`;
    return operatorName;
  }

  const allItems = [...platformMenuItems, ...operationalMenuItems];
  const activeItem = allItems.find((item) => pathname.startsWith(item.to));
  return activeItem?.label ?? 'Dashboard';
};
