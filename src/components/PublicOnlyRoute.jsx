import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Matches a pending OAuth callback still sitting in the URL hash: the
// session is actively being established, so the public page must not render.
const AUTH_CALLBACK_RE = /[#&?](access_token|code)=/;

// Gate for /login and /signup. Redirects any user who already holds a
// session straight back to the Home route, and refuses to render the public
// page while Supabase is still parsing an OAuth hash (token interception) —
// navigating away before that finishes would drop the tokens and restart
// the redirect loop.
export default function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  const oauthPending = AUTH_CALLBACK_RE.test(window.location.hash);

  if (loading || (oauthPending && !user)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return children;
}
