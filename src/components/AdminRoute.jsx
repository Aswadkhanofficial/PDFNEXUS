import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * DB-backed route guard for /admin. Membership is decided by admin_roles
 * (via RLS); non-admins are silently redirected to /dashboard.
 */
export default function AdminRoute({ children }) {
  const { user, loading, profile, isAdmin } = useAuth();
  const location = useLocation();

  if (loading || (user && profile === undefined)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}