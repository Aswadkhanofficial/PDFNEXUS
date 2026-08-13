import { useEffect } from 'react';
import Header from '../components/Header';
import RequireResetWall from '../components/RequireResetWall';
import Footer from '../components/landing/Footer';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { nukeSession } from '../utils/nukeSession';

export default function MainLayout({ children }) {
  const { user } = useAuth();

  // Silent post-login backfill: Google OAuth signups bypass the email
  // sign-up flow, so their IP location is never captured and the profile
  // row is left with a NULL/blank location. On every confirmed session,
  // check the profile and, if the location is missing, fetch it via the
  // IP geolocation API and persist it in the background. Fully
  // non-blocking — any failure (adblocker, offline API, rate limit) is
  // swallowed so the UI never waits or breaks.
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      try {
        // === Part A: Server‑side session verifier ===
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          return nukeSession();
        }

        // === Part B: Realtime ban listener ===
        const channel = supabase.channel('banned_listener')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'banned_users',
              filter: `user_id=eq.${uid}`,
            },
            () => {
              nukeSession();
            }
          )
          .subscribe();

        return () => {
          cancelled = true;
          supabase.removeChannel(channel);
        };
      } catch {
        // Silent — never block the UI.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-200">
      <Header />
      <main className="flex flex-1 flex-col">
        <RequireResetWall>{children}</RequireResetWall>
      </main>
      <Footer />
    </div>
  );
}
