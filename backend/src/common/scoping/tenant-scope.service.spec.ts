import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TenantScopeService } from './tenant-scope.service';

describe('TenantScopeService', () => {
  const prisma = {
    operator: {
      findUnique: jest.fn(),
    },
  } as any;

  const service = new TenantScopeService(prisma);

  const admin = {
    sub: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    operatorId: null,
  };

  const operator = {
    sub: 'op-1',
    email: 'op@test.com',
    role: UserRole.OPERATOR,
    operatorId: 'operator-a',
  };

  it('returns empty list scope for admin without requested operator', () => {
    expect(service.resolveListScope(admin)).toEqual({});
  });

  it('returns operator scope for admin when operatorId requested', () => {
    expect(service.resolveListScope(admin, 'operator-b')).toEqual({
      operatorId: 'operator-b',
    });
  });

  it('returns operator scope for operator', () => {
    expect(service.resolveListScope(operator)).toEqual({
      operatorId: 'operator-a',
    });
  });

  it('resolveEffectiveOperatorId returns undefined for admin without request', () => {
    expect(service.resolveEffectiveOperatorId(admin)).toBeUndefined();
  });

  it('resolveEffectiveOperatorId returns requested id for admin', () => {
    expect(service.resolveEffectiveOperatorId(admin, 'operator-b')).toBe(
      'operator-b',
    );
  });

  it('blocks cross-operator context for operator', () => {
    expect(() =>
      service.resolveEffectiveOperatorId(operator, 'operator-b'),
    ).toThrow(ForbiddenException);
    expect(service.resolveEffectiveOperatorId(operator)).toBe('operator-a');
  });

  it('requires operatorId for admin create', () => {
    expect(() => service.resolveCreateOperatorId(admin)).toThrow(
      BadRequestException,
    );
    expect(service.resolveCreateOperatorId(admin, 'operator-b')).toBe(
      'operator-b',
    );
  });

  it('resolveRequiredOperatorId requires operatorId for admin', () => {
    expect(() => service.resolveRequiredOperatorId(admin)).toThrow(
      BadRequestException,
    );
    expect(service.resolveRequiredOperatorId(admin, 'operator-b')).toBe(
      'operator-b',
    );
  });

  it('resolveRequiredOperatorId uses jwt for operator', () => {
    expect(service.resolveRequiredOperatorId(operator)).toBe('operator-a');
  });

  it('blocks cross-operator assignment for operator', () => {
    expect(() =>
      service.resolveCreateOperatorId(operator, 'operator-b'),
    ).toThrow(ForbiddenException);
    expect(service.resolveCreateOperatorId(operator)).toBe('operator-a');
  });

  it('asserts resource ownership for operator', () => {
    expect(() =>
      service.assertResourceOwnership(operator, 'operator-b'),
    ).toThrow(ForbiddenException);
    expect(() =>
      service.assertResourceOwnership(operator, 'operator-a'),
    ).not.toThrow();
  });
});
