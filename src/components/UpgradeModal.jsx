import { useEffect } from 'react';
import { Loader2, CheckCircle2, Sparkles, Check, X, Zap, ShieldCheck, CloudUpload } from 'lucide-react';

const PERKS = [
  { icon: Zap, text: 'Unlimited PDF processing on every tool' },
  { icon: CloudUpload, text: 'Cloud storage for all your documents' },
  { icon: ShieldCheck, text: 'Priority support and early feature access' },
];

export default function UpgradeModal({
  open, onClose, onUpgrade, isUpgrading, upgradeError, isPremium,
}) {
  useEffect(() => {
    if (!isPremium || !open) return;
    const timer = setTimeout(onClose, 1800);
    return () => clearTimeout(timer);
  }, [isPremium, open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Premium"
    >
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 dark:bg-slate-900/95 dark:border-slate-700/60">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors z-10 dark:hover:text-white dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isPremium ? (
          <div className="relative p-8 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center dark:text-green-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Premium Activated</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">You're all set — enjoy unlimited PDF processing.</p>
          </div>
        ) : (
          <div className="relative p-8 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-purple-500/20 text-purple-600 rounded-full flex items-center justify-center dark:text-purple-400">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Upgrade to Premium</h2>
                <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
                  You've reached your free limit for today. Unlock unlimited access.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 flex flex-col items-center gap-1 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold dark:text-slate-500">Free</span>
                <span className="text-lg font-extrabold text-slate-500 line-through">Limited</span>
                <span className="text-[11px] text-slate-600 text-center dark:text-slate-500">3 actions / day</span>
              </div>
              <div className="rounded-xl border border-purple-500/40 bg-purple-600/10 p-3 flex flex-col items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-purple-600 font-semibold dark:text-purple-400">Premium</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">Unlimited</span>
                <span className="text-[11px] text-slate-600 text-center dark:text-slate-400">7-day free trial</span>
              </div>
            </div>

            <ul className="space-y-2.5">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-purple-500/15 text-purple-600 flex items-center justify-center flex-shrink-0 dark:text-purple-400">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <Icon className="w-4 h-4 text-slate-500" />
                  {text}
                </li>
              ))}
            </ul>

            <button
              onClick={onUpgrade}
              disabled={isUpgrading}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/25"
            >
              {isUpgrading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Activating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Start Free 7-Day Trial</>
              )}
            </button>

            {upgradeError && (
              <p className="text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center dark:text-red-400">
                {upgradeError}
              </p>
            )}

            <p className="text-center text-xs text-slate-500">
              Cancel anytime. No credit card required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}