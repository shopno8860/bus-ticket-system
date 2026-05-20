import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import Dashboard from '../pages/Dashboard';
import PageTitle from '../../../components/PageTitle';

/** Platform stats for admin; operator/staff go to their company hub with module tabs. */
function OperatorDashboardRedirect() {
  const { isAdmin, operatorId } = usePermissions();

  if (!isAdmin && operatorId) {
    return <Navigate to={`/dashboard/operators/${operatorId}`} replace />;
  }

  return (
    <>
      <PageTitle title="Dashboard" />
      <Dashboard />
    </>
  );
}

export default OperatorDashboardRedirect;
