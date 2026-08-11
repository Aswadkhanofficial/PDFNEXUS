import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function FreeLimit() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4 text-center dark:bg-slate-900 dark:border-slate-800">
        <div className="w-16 h-16 bg-purple-500/20 text-purple-600 rounded-full flex items-center justify-center mb-2 dark:text-purple-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold">You have used your 3 free actions for this tool.</h2>
        <p className="text-slate-600 text-sm mb-4 dark:text-slate-400">
          Create a free account to continue with daily free credits and
          secure document storage.
        </p>
        <Link
          to="/signup"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-lg flex items-center justify-center transition-all"
        >
          Create Free Account
        </Link>
        <Link to="/login" className="text-sm text-purple-600 hover:text-purple-700 mt-2 dark:text-purple-400 dark:hover:text-purple-300">
          Already have an account? Log in
        </Link>
      </div>
    </div>
  );
}