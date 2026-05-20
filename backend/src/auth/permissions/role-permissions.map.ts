import { UserRole } from '@prisma/client';
import { Permission, PLATFORM_ADMIN_PERMISSIONS } from './permission.enum';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [...PLATFORM_ADMIN_PERMISSIONS],
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

export function roleHasAnyPermission(
  role: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => roleHasPermission(role, permission));
}
