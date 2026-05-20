import { UserRole } from '@prisma/client';
import { ALL_PERMISSIONS, Permission } from './permission.enum';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [...ALL_PERMISSIONS],
  [UserRole.OPERATOR]: [
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
  [UserRole.STAFF]: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_BOOKINGS,
    Permission.BOOK_TICKET,
  ],
  [UserRole.USER]: [],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}
