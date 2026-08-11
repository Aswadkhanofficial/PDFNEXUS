import { useState } from 'react';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

/**
 * Un-skippable forced-reset view. Rendered by RequireResetWall instead of any
 * tool/dashboard/admin content while `profiles.requires_password_reset` is
 * set. Full access is re-granted only after the password change lands.
 */
export default function ForceReset() {
  const { user, refreshProfile, signOut } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toastError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toastError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { error: flagError } = await supabase
        .from('profiles')
        .update({ requires_password_reset: false })
        .eq('id', user.id);
      if (flagError) throw flagError;
      await refreshProfile();
      toastSuccess('Password updated — welcome back!');
    } catch (error) {
      toastError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />

      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-slate-950/60 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

        <div className="text-center mb-8">
          <span className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-400 mb-4">
            <KeyRound className="w-7 h-7" />
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Update Your Password</h1>
          <p className="text-sm text-slate-400 mt-2">
            For security, a temporary password was issued for your account. Choose a new
            password to continue — access resumes as soon as it is saved.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              minLength={8}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            minLength={8}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-all duration-300 shadow-lg shadow-violet-600/30 mt-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          <button
            type="button"
            onClick={() => signOut()}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Sign out instead
          </button>
        </p>
      </div>
    </div>
  );
}