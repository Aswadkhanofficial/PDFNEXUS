import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ForceReset from '../pages/ForceReset';

/**
 * Un-skippable gate for authenticated areas: while the user's profile has
 * requires_password_reset set, every wrapped route renders the reset wall
 * instead of its content. Guests (no session) pass straight through.
 */
export default function RequireResetWall({ children }) {
  const { user, profile } = useAuth();

  if (user && profile === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (user && profile?.requires_password_reset) {
    return <ForceReset />;
  }

  return children;
}