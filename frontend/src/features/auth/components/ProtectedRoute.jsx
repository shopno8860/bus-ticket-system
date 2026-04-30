import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-[#16a34a]"></span>
      </div>
    );
  }

  if (!token) {
    // Redirect to login but save the current location to redirect back after login
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    (!user || !allowedRoles.includes(user.role))
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
