import {
  FaBus,
  FaChartPie,
  FaHandHolding,
  FaMapMarkedAlt,
  FaRoute,
  FaUsers,
} from 'react-icons/fa';

export const operatorMenuItems = [
  { to: '/operator/dashboard', label: 'Dashboard', icon: FaChartPie },
  { to: '/operator/bus', label: 'Bus Management', icon: FaBus },
  { to: '/operator/route', label: 'Route Management', icon: FaMapMarkedAlt },
  { to: '/operator/trip', label: 'Trip Management', icon: FaRoute },
  { to: '/operator/booking', label: 'Book Ticket', icon: FaHandHolding },
  { to: '/operator/staff', label: 'Staff Management', icon: FaUsers },
];

export const getOperatorPageTitle = (pathname) => {
  const activeItem = operatorMenuItems.find((item) => pathname.startsWith(item.to));
  return activeItem?.label ?? 'Operator Dashboard';
};
