import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAIGate } from '../hooks/useAIGate.jsx';
import { guardAICall, checkRateLimit, cooldownMessage } from '../services/aiRateLimiter';
import { useToast } from '../components/Toast';

/**
 * Hidden e2e harness for the AI auth gate + rate limiter. Not linked from
 * any nav or page; reachable only at /__dev/authgate. Exercises the raw
 * infrastructure without touching real tool UI.
 */
export default function AuthGateHarness() {
  const { user } = useAuth();
  const { gate, gateModal } = useAIGate();
  const { error: toastError } = useToast();
  const [runs, setRuns] = useState(0);
  const [result, setResult] = useState('none');

  const runGated = () => {
    if (gate()) setRuns((n) => n + 1);
  };

  const call429 = async () => {
    const res = await guardAICall(async () => {
      throw Object.assign(new Error('Too Many Requests'), { status: 429 });
    });
    setResult(res.rateLimited ? `rate-limited:${res.seconds}` : JSON.stringify(res));
    if (!res.ok) toastError(cooldownMessage(res.seconds));
  };

  const callOk = async () => {
    const res = await guardAICall(async () => 'asset-ok');
    setResult(res.ok ? `ok:${res.data}` : res.rateLimited ? `rate-limited:${res.seconds}` : `error:${res.error?.message}`);
    if (!res.ok) toastError(res.rateLimited ? cooldownMessage(res.seconds) : 'AI service error. Please try again.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 dark:bg-slate-950 dark:text-white">
      <h1 className="text-xl font-bold">AuthGate Harness</h1>
      <p data-testid="auth-state">{user ? 'authed' : 'guest'}</p>
      <p data-testid="runs">runs:{runs}</p>
      <p data-testid="cooldown">cooldown:{checkRateLimit().seconds}</p>
      <p data-testid="result">{result}</p>
      <div className="flex flex-col gap-2 w-64 mt-4">
        <button type="button" onClick={runGated} className="bg-purple-600 rounded-lg py-2">
          Run gated action
        </button>
        <button type="button" onClick={call429} className="bg-slate-200 rounded-lg py-2 dark:bg-slate-700">
          Trigger AI call (429)
        </button>
        <button type="button" onClick={callOk} className="bg-slate-200 rounded-lg py-2 dark:bg-slate-700">
          Trigger AI call (ok)
        </button>
      </div>
      {gateModal}
    </div>
  );
}