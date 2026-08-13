import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function Banned() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    for (let key in localStorage) {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-500/20 p-8 text-center dark:bg-slate-900">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2 dark:text-white">Account Suspended</h1>
        <p className="text-slate-600 mb-8 dark:text-slate-400 text-sm leading-relaxed">
          Your account has been banned by the administrator. You no longer have access to the workspace. If you believe this is a mistake, contact support.
        </p>
        <button 
          onClick={handleLogout} 
          className="flex items-center justify-center w-full gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
        >
          <LogOut className="w-5 h-5" /> 
          Logout Securely
        </button>
      </div>
    </div>
  );
}