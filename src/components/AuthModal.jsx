import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';

export const AI_GATE_MESSAGE = 'AI features require a free verified account. Please log in or sign up.';

/**
 * Reusable auth popup for gated (AI) features. Visitors get an explicit
 * login/signup CTA instead of an unexplained error.
 */
export default function AuthModal({ open, onClose, message = AI_GATE_MESSAGE }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication required"
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 dark:bg-slate-900/95 dark:border-slate-700/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors z-10 dark:hover:text-white dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-8 flex flex-col items-center text-center gap-4">
          <span className="w-16 h-16 bg-purple-500/20 text-purple-600 rounded-full flex items-center justify-center dark:text-purple-400">
            <Sparkles className="w-8 h-8" />
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create a free account</h2>
          <p className="text-sm text-slate-600 leading-relaxed dark:text-slate-400">{message}</p>
          <Link
            to="/signup"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/25"
          >
            Create Free Account
          </Link>
          <Link
            to="/login"
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-xl transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}