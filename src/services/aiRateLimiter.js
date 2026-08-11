export const AI_COOLDOWN_MS = 30_000;
const STORAGE_KEY = 'next_ai_call_allowed_at';

const readTimestamp = () => {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
};

/** Whole seconds left before the next AI call is allowed (0 = allowed). */
export const getCooldownSeconds = () => Math.max(0, Math.ceil((readTimestamp() - Date.now()) / 1000));

/** Client-side throttle check. Stamp is set after every successful or 429 call. */
export const checkRateLimit = () => {
  const seconds = getCooldownSeconds();
  return seconds > 0 ? { ok: false, seconds } : { ok: true, seconds: 0 };
};

export const markAICall = () => {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + AI_COOLDOWN_MS));
  } catch {
    /* storage unavailable - rate limiting is best-effort */
  }
};

export const cooldownMessage = (seconds) =>
  `Server is processing high volumes. Please wait ${seconds} seconds.`;

/** True for any 429-flavoured error from fetch / Supabase / Edge Functions. */
export const isRateLimited = (error) =>
  !!error &&
  (error?.status === 429 ||
    error?.code === 429 ||
    /too many requests|rate limit|429/.test(String(error?.message || error)));

/**
 * Wraps an AI API call with both throttles. Never throws: every outcome is
 * a result object so the caller can toast instead of the app crashing.
 * - blocked by cooldown  -> { ok:false, seconds }
 * - HTTP 429 from server -> marks cooldown, { ok:false, rateLimited:true }
 * - other failure        -> { ok:false, error }
 */
export const guardAICall = async (fn) => {
  const gate = checkRateLimit();
  if (!gate.ok) return { ok: gate.ok, seconds: gate.seconds, error: null, rateLimited: true };
  try {
    const data = await fn();
    markAICall();
    return { ok: true, seconds: 0, error: null, data };
  } catch (error) {
    if (isRateLimited(error)) {
      markAICall();
      return { ok: false, seconds: AI_COOLDOWN_MS / 1000, error, rateLimited: true };
    }
    return { ok: false, seconds: 0, error };
  }
};