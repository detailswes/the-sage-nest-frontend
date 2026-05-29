import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Preserve booking context so it survives through login/register
    if (location.pathname === '/book') {
      const params = new URLSearchParams(location.search);
      const expertId = params.get('expertId');
      if (expertId) {
        sessionStorage.setItem('sage_booking_ctx', JSON.stringify({
          expertId,
          serviceId: params.get('serviceId'),
          returnUrl: params.get('return_url'),
        }));
      }
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;
