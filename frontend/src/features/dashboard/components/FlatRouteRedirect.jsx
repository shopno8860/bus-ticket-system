import { Navigate, useParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

function FlatRouteRedirect({ resource, preserveParams = false }) {
  const { isAdmin, operatorId } = usePermissions();
  const params = useParams();

  if (isAdmin) {
    return <Navigate to="/dashboard/operators" replace />;
  }

  if (!operatorId) {
    return <Navigate to="/dashboard/dashboard" replace />;
  }

  let path = `/dashboard/operators/${operatorId}/${resource}`;
  if (preserveParams && params.tripId) {
    path = `/dashboard/operators/${operatorId}/booking/seats/${params.tripId}`;
  }

  return <Navigate to={path} replace />;
}

export default FlatRouteRedirect;
