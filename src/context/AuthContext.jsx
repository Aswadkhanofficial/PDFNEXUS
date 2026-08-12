import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

const PROFILE_COLS = 'id, email, full_name, avatar_url, is_banned, requires_password_reset, premium_until, created_at';

// Matches a pending OAuth callback: Supabase tokens (implicit) or a PKCE code
// still sitting in the URL hash, meaning the session exchange is in flight.
const AUTH_CALLBACK_RE = /[#&?](access_token|code)=/;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // undefined = not loaded yet; null = loaded, no row
  const [profile, setProfile] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prevUserId, setPrevUserId] = useState(null);
  const currentUserIdRef = useRef(null);

  // Capture OAuth (Google) display name + avatar from user metadata and sync
  // them into public.profiles so the profile row is always up to date.
  const syncProfileFromMetadata = useCallback(async (authUser) => {
    if (!authUser) return;
    const metadata = authUser.user_metadata ?? {};
    const full_name = metadata.full_name || metadata.name || null;
    const avatar_url = metadata.avatar_url || metadata.picture || null;

    try {
      const { data } = await supabase
        .from('profiles')
        .select(PROFILE_COLS)
        .eq('id', authUser.id)
        .maybeSingle();
      if (currentUserIdRef.current === authUser.id) setProfile(data ?? null);
    } catch {
      // Non-fatal: profile sync is best-effort; the next session event retries.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Token interception: Supabase parses the OAuth hash from the URL
    // asynchronously (including the network exchange). During that window
    // getSession() can legitimately resolve with NO session — so we must
    // not flip out of `loading` while an auth hash is still pending on the
    // URL. Prematurely booting the public login page here is what lets the
    // redirect loop win; the SIGNED_IN/INITIAL_SESSION event that follows
    // resolves `loading` once the session is actually established.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      currentUserIdRef.current = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      if (!session && AUTH_CALLBACK_RE.test(window.location.hash)) return;
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      currentUserIdRef.current = nextUser?.id ?? null;
      setUser(nextUser);
      setLoading(false);
      if (event === 'SIGNED_IN' && nextUser) {
        syncProfileFromMetadata(nextUser);
        if (window.location.pathname !== '/') window.location.assign('/');
      } else if (nextUser && ['INITIAL_SESSION', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
        syncProfileFromMetadata(nextUser);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [syncProfileFromMetadata]);

  // Reset profile/admin state as the session switches; loading resumes.
  const userId = user?.id ?? null;
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setProfile(userId ? undefined : null);
    setIsAdmin(false);
  }

  // Auth interceptor: fetch own profile + admin_roles membership. RLS keeps
  // non-admins at zero rows, so `isAdmin` is DB-governed, not client logic.
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let cancelled = false;
    Promise.all([
      supabase.from('profiles').select(PROFILE_COLS).eq('id', uid).maybeSingle(),
      supabase.from('admin_roles').select('role_type').eq('user_id', uid).maybeSingle(),
    ]).then(([p, role]) => {
      if (cancelled) return;
      setProfile(p.data ?? null);
      setIsAdmin(!!role.data);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .eq('id', user.id)
      .maybeSingle();
    setProfile(data ?? null);
    return data ?? null;
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, profile, isAdmin, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}