import { usePermissions } from './usePermissions';

export function useDashboardScope() {
  const { isAdmin, isOperator, isStaff, operatorId, can } = usePermissions();

  return {
    isAdmin,
    isOperator,
    isStaff,
    operatorId,
    can,
    showOperatorColumn: isAdmin,
    requireOperatorOnCreate: isAdmin,
  };
}
