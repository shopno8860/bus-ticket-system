import { Navigate, Outlet, useParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

function OperatorAccessGate() {
  const { operatorId: paramOperatorId } = useParams();
  const { isAdmin, operatorId: jwtOperatorId } = usePermissions();

  if (!paramOperatorId) {
    return <Navigate to="/dashboard/operators" replace />;
  }

  if (!isAdmin && jwtOperatorId && paramOperatorId !== jwtOperatorId) {
    return (
      <Navigate to={`/dashboard/operators/${jwtOperatorId}`} replace />
    );
  }

  return <Outlet />;
}

export default OperatorAccessGate;
