export const Permission = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_BUSES: 'view_buses',
  VIEW_ROUTES: 'view_routes',
  VIEW_TRIPS: 'view_trips',
  VIEW_BOOKINGS: 'view_bookings',
  VIEW_PAYMENTS: 'view_payments',
  VIEW_REFUNDS: 'view_refunds',
  VIEW_STAFF: 'view_staff',
  MANAGE_BUSES: 'manage_buses',
  MANAGE_ROUTES: 'manage_routes',
  MANAGE_TRIPS: 'manage_trips',
  MANAGE_BOOKINGS: 'manage_bookings',
  MANAGE_PAYMENTS: 'manage_payments',
  MANAGE_REFUNDS: 'manage_refunds',
  MANAGE_STAFF: 'manage_staff',
  MANAGE_OPERATORS: 'manage_operators',
  MANAGE_USERS: 'manage_users',
  BOOK_TICKET: 'book_ticket',
};

export const PLATFORM_ADMIN_PERMISSIONS = [
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

export const ROLE_PERMISSIONS = {
  ADMIN: [...PLATFORM_ADMIN_PERMISSIONS],
  OPERATOR: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_BUSES,
    Permission.MANAGE_ROUTES,
    Permission.MANAGE_TRIPS,
    Permission.MANAGE_BOOKINGS,
    Permission.MANAGE_PAYMENTS,
    Permission.MANAGE_REFUNDS,
    Permission.MANAGE_STAFF,
    Permission.BOOK_TICKET,
  ],
  STAFF: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_BOOKINGS,
    Permission.BOOK_TICKET,
  ],
  USER: [],
};

export function getPermissionsForRole(role) {
  const normalized = typeof role === 'string' ? role.toUpperCase() : '';
  return ROLE_PERMISSIONS[normalized] ?? [];
}

export function roleHasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission);
}

export function roleHasAnyPermission(role, permissions) {
  return permissions.some((permission) => roleHasPermission(role, permission));
}
