import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function FreeLimit({ featureLabel = 'uses' }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mb-2">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold">One Free Action Used</h2>
        <p className="text-slate-400 text-sm mb-4">
          Your free {featureLabel} are done. Create a free account to keep
          processing with daily free credits and secure document storage.
        </p>
        <Link
          to="/signup"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-lg flex items-center justify-center transition-all"
        >
          Create Free Account
        </Link>
        <Link to="/login" className="text-sm text-purple-400 hover:text-purple-300 mt-2">
          Already have an account? Log in
        </Link>
      </div>
    </div>
  );
}