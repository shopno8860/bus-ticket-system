import { useParams } from 'react-router-dom';
import { useOperatorScope } from '../context/OperatorScopeContext';
import { usePermissions } from './usePermissions';

export function useDashboardScope() {
  const { isAdmin, isOperator, isStaff, operatorId: jwtOperatorId, can } =
    usePermissions();
  const { operatorId: routeOperatorId, inOperatorHub } = useOperatorScope();
  const params = useParams();

  const operatorId =
    routeOperatorId ?? params.operatorId ?? jwtOperatorId ?? null;
  const isScopedView = inOperatorHub || Boolean(operatorId && isAdmin);
  const isPlatformReadOnly = isAdmin;

  return {
    isAdmin,
    isOperator,
    isStaff,
    operatorId,
    can,
    inOperatorHub,
    isPlatformReadOnly,
    showOperatorColumn: isAdmin && !isScopedView,
    requireOperatorOnCreate: isAdmin && !operatorId,
  };
}
