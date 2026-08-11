import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUsage, trackUsage } from '../services/usageService';

export const DAILY_LIMIT = 3;
export const GUEST_LIMIT = 3;
const STORAGE_KEY = 'pdfnexus_guest_usage';

const IDLE = { used: 0, remaining: DAILY_LIMIT, locked: false, premium: false };

const readGuestCount = (feature) => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')[feature] || 0;
  } catch {
    return 0;
  }
};

const writeGuestCount = (feature, count) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[feature] = count;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable - guest budget is best-effort */
  }
};

const guestUsage = (used) => ({
  used,
  remaining: Math.max(0, GUEST_LIMIT - used),
  locked: used >= GUEST_LIMIT,
  premium: false,
});

/**
 * Mirrors the server-side quota for one tool (`featureName`).
 * - Logged-in: daily usage per action_type from the user_usage table
 *   (Supabase RLS-backed RPC calls).
 * - Guests: browser-local budget of GUEST_LIMIT per feature, persisted in
 *   localStorage under `pdfnexus_guest_usage`; `locked` rigidly flips once
 *   the count reaches the limit, blocking worker execution via the paywall.
 * Clean handoff: guest localStorage is read only when no session exists, so
 * member tracking through the RPC path is untouched.
 * Never throws: a Supabase/storage hiccup degrades to "unlimited" rather
 * than blocking the happy path.
 */
export function useUsageTracking(featureName) {
  const { user } = useAuth();
  const [usage, setUsage] = useState(() => (user ? IDLE : guestUsage(readGuestCount(featureName))));
  const [ready, setReady] = useState(false);
  const [prevKey, setPrevKey] = useState('');

  const key = `${!!user}:${featureName}`;
  if (key !== prevKey) {
    setPrevKey(key);
    if (user) {
      setUsage(IDLE);
      setReady(false);
    } else {
      setUsage(guestUsage(readGuestCount(featureName)));
      setReady(true);
    }
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUsage(featureName)
      .then((u) => {
        if (!cancelled && u) setUsage(u);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, featureName]);

  const track = async () => {
    if (!user) {
      const next = guestUsage(readGuestCount(featureName) + 1);
      writeGuestCount(featureName, next.used);
      setUsage(next);
      return next;
    }
    try {
      const u = await trackUsage(featureName);
      if (u) setUsage(u);
      return u;
    } catch {
      return null;
    }
  };

  const refresh = async () => {
    if (!user) {
      const next = guestUsage(readGuestCount(featureName));
      setUsage(next);
      return next;
    }
    try {
      const u = await getUsage(featureName);
      if (u) setUsage(u);
      return u;
    } catch {
      return null;
    }
  };

  return { ...usage, ready, track, refresh };
}