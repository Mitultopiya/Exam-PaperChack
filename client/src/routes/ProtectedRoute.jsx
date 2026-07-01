import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

// Guards routes that require an authenticated admin.
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Spinner label="Checking session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
