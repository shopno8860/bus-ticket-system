import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Permission } from '../permissions/permission.enum';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
} from '../decorators/require-permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { roleHasPermission } from '../permissions/role-permissions.map';

describe('PermissionsGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const guard = new PermissionsGuard(reflector);

  const makeContext = (role: UserRole) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            sub: 'user-1',
            email: 'user@test.com',
            role,
            operatorId: role === UserRole.ADMIN ? null : 'operator-a',
          },
        }),
      }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows when no permissions metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeContext(UserRole.STAFF))).toBe(true);
  });

  it('denies staff for manage_buses', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) {
          return [Permission.MANAGE_BUSES];
        }
        return undefined;
      });
    expect(() => guard.canActivate(makeContext(UserRole.STAFF))).toThrow(
      ForbiddenException,
    );
  });

  it('allows staff for book_ticket', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) {
          return [Permission.BOOK_TICKET];
        }
        return undefined;
      });
    expect(guard.canActivate(makeContext(UserRole.STAFF))).toBe(true);
  });

  it('allows admin with VIEW_BUSES via any mode', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) {
          return [Permission.VIEW_BUSES, Permission.MANAGE_BUSES];
        }
        if (key === PERMISSIONS_MODE_KEY) {
          return 'any';
        }
        return undefined;
      });
    expect(guard.canActivate(makeContext(UserRole.ADMIN))).toBe(true);
  });

  it('denies admin for manage_buses write-only', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) {
          return [Permission.MANAGE_BUSES];
        }
        return undefined;
      });
    expect(() => guard.canActivate(makeContext(UserRole.ADMIN))).toThrow(
      ForbiddenException,
    );
  });
});

describe('ADMIN platform permissions', () => {
  it('has view permissions but not manage operational permissions', () => {
    expect(roleHasPermission(UserRole.ADMIN, Permission.VIEW_BUSES)).toBe(
      true,
    );
    expect(roleHasPermission(UserRole.ADMIN, Permission.MANAGE_BUSES)).toBe(
      false,
    );
    expect(roleHasPermission(UserRole.ADMIN, Permission.BOOK_TICKET)).toBe(
      false,
    );
    expect(
      roleHasPermission(UserRole.ADMIN, Permission.MANAGE_OPERATORS),
    ).toBe(true);
  });
});
