import { useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import {
  getPermissionsForRole,
  roleHasAnyPermission,
  roleHasPermission,
} from '../config/permissions';

export function usePermissions() {
  const { user, isAdmin, isOperator, isStaff } = useAuth();
  const role = user?.role;

  const permissions = useMemo(
    () => getPermissionsForRole(role),
    [role],
  );

  const can = (permission) => roleHasPermission(role, permission);

  const canAny = (...perms) => {
    const list = perms.flat();
    return roleHasAnyPermission(role, list);
  };

  return {
    role,
    permissions,
    can,
    canAny,
    isAdmin,
    isOperator,
    isStaff,
    operatorId: user?.operatorId ?? null,
  };
}
