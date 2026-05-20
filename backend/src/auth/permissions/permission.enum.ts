export enum Permission {
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_BUSES = 'view_buses',
  VIEW_ROUTES = 'view_routes',
  VIEW_TRIPS = 'view_trips',
  VIEW_BOOKINGS = 'view_bookings',
  VIEW_PAYMENTS = 'view_payments',
  VIEW_REFUNDS = 'view_refunds',
  VIEW_STAFF = 'view_staff',
  MANAGE_BUSES = 'manage_buses',
  MANAGE_ROUTES = 'manage_routes',
  MANAGE_TRIPS = 'manage_trips',
  MANAGE_BOOKINGS = 'manage_bookings',
  MANAGE_PAYMENTS = 'manage_payments',
  MANAGE_REFUNDS = 'manage_refunds',
  MANAGE_STAFF = 'manage_staff',
  MANAGE_OPERATORS = 'manage_operators',
  MANAGE_USERS = 'manage_users',
  BOOK_TICKET = 'book_ticket',
}

export const ALL_PERMISSIONS = Object.values(Permission);

export const PLATFORM_ADMIN_PERMISSIONS: Permission[] = [
  Permission.VIEW_DASHBOARD,
  Permission.MANAGE_OPERATORS,
  Permission.MANAGE_USERS,
  Permission.VIEW_BUSES,
  Permission.VIEW_ROUTES,
  Permission.VIEW_TRIPS,
  Permission.VIEW_BOOKINGS,
  Permission.VIEW_PAYMENTS,
  Permission.VIEW_REFUNDS,
  Permission.VIEW_STAFF,
];
