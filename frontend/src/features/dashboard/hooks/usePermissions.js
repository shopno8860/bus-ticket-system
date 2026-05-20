import { useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { getPermissionsForRole, roleHasPermission } from '../config/permissions';

export function usePermissions() {
  const { user, isAdmin, isOperator, isStaff } = useAuth();
  const role = user?.role;

  const permissions = useMemo(
    () => getPermissionsForRole(role),
    [role],
  );

  const can = (permission) => roleHasPermission(role, permission);

  return {
    role,
    permissions,
    can,
    isAdmin,
    isOperator,
    isStaff,
    operatorId: user?.operatorId ?? null,
  };
}
