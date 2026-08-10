import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUsage, trackUsage } from '../services/usageService';

export const DAILY_LIMIT = 3;

const IDLE = { used: 0, remaining: DAILY_LIMIT, locked: false, premium: false };

/**
 * Mirrors the server-side quota for one tool (`featureName`).
 * - Logged-in: daily usage per action_type from the user_usage table.
 * - Guests: no server rows exist; state stays idle — usePaywall layers
 *   the 1-free-action guest budget on top.
 * Never throws: a Supabase hiccup degrades to "unlimited" rather than
 * blocking the happy path.
 */
export function useUsageTracking(featureName) {
  const { user } = useAuth();
  const [usage, setUsage] = useState(IDLE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setUsage(IDLE);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
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
    if (!user) return null;
    try {
      const u = await trackUsage(featureName);
      if (u) setUsage(u);
      return u;
    } catch {
      return null;
    }
  };

  const refresh = async () => {
    if (!user) return null;
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