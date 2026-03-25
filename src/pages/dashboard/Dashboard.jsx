import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'EXPERT') return <Navigate to="/dashboard/expert/profile" replace />;
  if (user.role === 'ADMIN')  return <Navigate to="/dashboard/admin" replace />;

  // PARENT — redirect to their dashboard
  return <Navigate to="/dashboard/parent/browse" replace />;
};

export default Dashboard;
