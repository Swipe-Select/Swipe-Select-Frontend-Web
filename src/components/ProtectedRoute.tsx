import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readSession } from '../auth/storage';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();

  const token =
    (typeof session?.token === 'string' && session.token.trim()) ||
    readSession()?.token?.trim();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
