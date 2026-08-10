import { useEffect } from 'react';
import { Loader2, CheckCircle2, Sparkles, Check, X } from 'lucide-react';

const PERKS = [
  'Unlimited PDF processing on every tool',
  'Cloud storage for all your documents',
  'Early access to new features',
];

export default function PremiumModal({
  open, onClose, onUpgrade, isUpgrading, upgradeError, used, maxUses, isPremium,
}) {
  useEffect(() => {
    if (!isPremium || !open) return;
    const timer = setTimeout(onClose, 1600);
    return () => clearTimeout(timer);
  }, [isPremium, open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isPremium ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Premium Activated</h2>
            <p className="text-sm text-slate-400">You're all set — enjoy unlimited PDF processing.</p>
          </div>
        ) : (
          <div className="p-8 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-white">Premium required</h2>
                <p className="text-sm text-slate-400 mt-2">
                  You've processed <span className="text-white font-bold">{used}</span> of your{' '}
                  <span className="text-white font-bold">{maxUses}</span> free documents.
                </p>
              </div>
            </div>

            <ul className="space-y-2.5">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <button
              onClick={onUpgrade}
              disabled={isUpgrading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20"
            >
              {isUpgrading ? <><Loader2 className="w-5 h-5 animate-spin" /> Activating...</> : 'Upgrade to Premium'}
            </button>

            {upgradeError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                {upgradeError}
              </p>
            )}

            <p className="text-center text-xs text-slate-500">
              Includes a 7-day free trial. Cancel anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}