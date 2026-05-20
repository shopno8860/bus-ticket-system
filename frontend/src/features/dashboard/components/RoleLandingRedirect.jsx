import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

const LAST_OPERATOR_KEY = 'dashboard:lastOperatorId';

function RoleLandingRedirect() {
  const { isAdmin, operatorId } = usePermissions();

  if (isAdmin) {
    const lastOperatorId = localStorage.getItem(LAST_OPERATOR_KEY);
    if (lastOperatorId) {
      return <Navigate to={`/dashboard/operators/${lastOperatorId}`} replace />;
    }
    return <Navigate to="/dashboard/operators" replace />;
  }

  if (operatorId) {
    return <Navigate to={`/dashboard/operators/${operatorId}`} replace />;
  }

  return <Navigate to="/dashboard/dashboard" replace />;
}

export default RoleLandingRedirect;
