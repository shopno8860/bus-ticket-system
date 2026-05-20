import { Navigate, useLocation } from 'react-router-dom';

function LegacyDashboardRedirect() {
  const { pathname, search, hash } = useLocation();
  const nextPath = pathname.replace(/^\/(admin|operator|staff)/, '/dashboard');
  return <Navigate to={`${nextPath}${search}${hash}`} replace />;
}

export default LegacyDashboardRedirect;
