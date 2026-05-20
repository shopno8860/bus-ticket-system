import { UserRole } from '@prisma/client';
import { Permission } from './permission.enum';
import { getPermissionsForRole, roleHasPermission } from './role-permissions.map';

describe('role-permissions.map', () => {
  it('grants all permissions to ADMIN', () => {
    expect(roleHasPermission(UserRole.ADMIN, Permission.MANAGE_OPERATORS)).toBe(
      true,
    );
    expect(getPermissionsForRole(UserRole.ADMIN)).toContain(
      Permission.MANAGE_USERS,
    );
  });

  it('grants fleet permissions to OPERATOR but not manage_operators', () => {
    expect(roleHasPermission(UserRole.OPERATOR, Permission.MANAGE_BUSES)).toBe(
      true,
    );
    expect(
      roleHasPermission(UserRole.OPERATOR, Permission.MANAGE_OPERATORS),
    ).toBe(false);
  });

  it('limits STAFF to bookings and book_ticket', () => {
    expect(roleHasPermission(UserRole.STAFF, Permission.BOOK_TICKET)).toBe(true);
    expect(roleHasPermission(UserRole.STAFF, Permission.MANAGE_BUSES)).toBe(
      false,
    );
    expect(getPermissionsForRole(UserRole.STAFF)).toEqual([
      Permission.VIEW_DASHBOARD,
      Permission.MANAGE_BOOKINGS,
      Permission.BOOK_TICKET,
    ]);
  });
});
