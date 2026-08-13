import { useEffect } from 'react';
import Header from '../components/Header';
import RequireResetWall from '../components/RequireResetWall';
import Footer from '../components/landing/Footer';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

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
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('location')
          .eq('id', uid)
          .single();
        if (cancelled) return;
        if (!profile?.location || profile.location === 'Unknown' || profile.location === '-') {
          const res = await fetch('https://ipapi.co/json/');
          const locData = await res.json();
          const location = `${locData.city || 'Unknown'}, ${locData.country_name || 'Unknown'}`;
          await supabase.from('profiles').update({ location }).eq('id', uid);
        }
      } catch {
        // Silent by design: background best-effort, never blocks the app.
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
