import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

const PROFILE_COLS = 'id, email, is_banned, requires_password_reset, premium_until, created_at';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // undefined = not loaded yet; null = loaded, no row
  const [profile, setProfile] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prevUserId, setPrevUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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