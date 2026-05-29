import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    // Restore booking context saved before login redirect
    const stored = sessionStorage.getItem('sage_booking_ctx');
    if (stored) {
      try {
        const { expertId, serviceId, returnUrl } = JSON.parse(stored);
        if (expertId) {
          const params = new URLSearchParams();
          params.set('expertId', expertId);
          if (serviceId) params.set('serviceId', serviceId);
          if (returnUrl) params.set('return_url', returnUrl);
          // Don't clear here — BookPage clears it on mount after consuming
          return <Navigate to={`/book?${params}`} replace />;
        }
      } catch {
        sessionStorage.removeItem('sage_booking_ctx');
      }
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default GuestRoute;
