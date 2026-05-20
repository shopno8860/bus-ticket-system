export enum Permission {
  VIEW_DASHBOARD = 'view_dashboard',
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
