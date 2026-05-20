import {
  FaBus,
  FaChartPie,
  FaCreditCard,
  FaHandHolding,
  FaMapMarkedAlt,
  FaRoute,
  FaTicketAlt,
  FaUndoAlt,
  FaUserFriends,
} from 'react-icons/fa';
import { Permission } from './permissions';

export const operatorHubTabs = [
  {
    segment: '',
    label: 'Overview',
    icon: FaChartPie,
    permissions: [Permission.VIEW_DASHBOARD],
  },
  {
    segment: 'bus',
    label: 'Buses',
    icon: FaBus,
    permissions: [Permission.VIEW_BUSES, Permission.MANAGE_BUSES],
  },
  {
    segment: 'route',
    label: 'Routes',
    icon: FaMapMarkedAlt,
    permissions: [Permission.VIEW_ROUTES, Permission.MANAGE_ROUTES],
  },
  {
    segment: 'trip',
    label: 'Trips',
    icon: FaRoute,
    permissions: [Permission.VIEW_TRIPS, Permission.MANAGE_TRIPS],
  },
  {
    segment: 'booking/manage',
    label: 'Bookings',
    icon: FaTicketAlt,
    permissions: [Permission.VIEW_BOOKINGS, Permission.MANAGE_BOOKINGS],
  },
  {
    segment: 'booking',
    label: 'Book Ticket',
    icon: FaHandHolding,
    permissions: [Permission.BOOK_TICKET],
    end: false,
  },
  {
    segment: 'payment',
    label: 'Payments',
    icon: FaCreditCard,
    permissions: [Permission.VIEW_PAYMENTS, Permission.MANAGE_PAYMENTS],
  },
  {
    segment: 'refund',
    label: 'Refunds',
    icon: FaUndoAlt,
    permissions: [Permission.VIEW_REFUNDS, Permission.MANAGE_REFUNDS],
  },
  {
    segment: 'staff',
    label: 'Staff',
    icon: FaUserFriends,
    permissions: [Permission.VIEW_STAFF, Permission.MANAGE_STAFF],
  },
];

export function getOperatorHubTabPath(operatorId, segment) {
  const base = `/dashboard/operators/${operatorId}`;
  if (!segment) {
    return base;
  }
  return `${base}/${segment}`;
}
