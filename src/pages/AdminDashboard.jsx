import { useCallback, useEffect, useState } from 'react';
import {
  Users, Ban, ShieldCheck, KeyRound, Loader2, RefreshCw, Copy, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../components/Toast';

const ROW_COLS = 'id, email, is_banned, requires_password_reset, premium_until, created_at';

const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminDashboard() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [tempPassword, setTempPassword] = useState({ userId: null, password: '', email: '' });
  const [copied, setCopied] = useState(false);

  const loadUsers = useCallback(() => {
    supabase
      .from('profiles')
      .select(ROW_COLS)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toastError(`Could not load users: ${error.message}`);
          return;
        }
        setUsers(data ?? []);
      });
  }, [toastError]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleBan = async (row) => {
    setBusyId(row.id);
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !row.is_banned })
      .eq('id', row.id);
    setBusyId(null);
    if (error) {
      toastError(error.message);
      return;
    }
    toastSuccess(row.is_banned ? 'User unbanned' : 'User banned');
    loadUsers();
  };

  const generateTempPassword = async (row) => {
    setBusyId(row.id);
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { user_id: row.id },
    });
    setBusyId(null);
    if (error || data?.error) {
      toastError(error?.message || data?.error || 'Failed to generate temporary password');
      return;
    }
    setCopied(false);
    setTempPassword({ userId: row.id, password: data.temp_password, email: row.email });
    loadUsers();
  };

  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword.password);
      setCopied(true);
      toastSuccess('Temporary password copied');
    } catch {
      toastError('Could not copy — select and copy the password manually.');
    }
  };

  return (
    <div className="flex-1 bg-white px-6 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight dark:text-white">Admin Console</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">User management — RBAC enforced by the database.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 px-4 py-2 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {tempPassword.userId && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5" role="alert">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  Temporary password for {tempPassword.email}
                </p>
                <p className="text-xs text-amber-800/80 mt-1 dark:text-amber-200/70">
                  This is shown once. Share it securely — the user will be forced to change it at next login.
                </p>
              </div>
              <button
                type="button"
                onClick={copyTempPassword}
                className="flex items-center gap-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-sm font-bold text-amber-700 px-4 py-2 transition-colors shrink-0 dark:text-amber-200"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <code className="mt-3 block select-all rounded-lg bg-slate-100 border border-amber-500/20 px-4 py-3 font-mono text-lg font-bold tracking-widest text-amber-700 dark:bg-slate-950/80 dark:text-amber-100">
              {tempPassword.password}
            </code>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-600 dark:text-slate-400">No users found.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-5 py-3.5 font-semibold">User</th>
                  <th className="px-5 py-3.5 font-semibold">Joined</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id} className="border-b border-slate-200/80 last:border-0 hover:bg-slate-100/70 transition-colors dark:border-slate-800/60 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{row.email || '—'}</p>
                      <p className="text-xs text-slate-500 font-mono dark:text-slate-500">{row.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{row.created_at ? formatDate(row.created_at) : '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {row.is_banned && (
                          <span className="rounded-full bg-red-500/15 text-red-600 text-xs font-bold px-2.5 py-1 dark:text-red-400">Banned</span>
                        )}
                        {row.requires_password_reset && (
                          <span className="rounded-full bg-amber-500/15 text-amber-700 text-xs font-bold px-2.5 py-1 dark:text-amber-400">Reset required</span>
                        )}
                        {row.premium_until && new Date(row.premium_until) > new Date() && (
                          <span className="rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-bold px-2.5 py-1 dark:text-emerald-400">Premium</span>
                        )}
                        {!row.is_banned && !row.requires_password_reset && (
                          <span className="rounded-full bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 dark:bg-slate-700/60 dark:text-slate-300">Active</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => toggleBan(row)}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                            row.is_banned
                              ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
                              : 'bg-red-500/15 text-red-600 hover:bg-red-500/25 dark:text-red-400'
                          }`}
                        >
                          {busyId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                          {row.is_banned ? 'Unban' : 'Ban'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => generateTempPassword(row)}
                          className="flex items-center gap-1.5 rounded-lg bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 dark:text-purple-300"
                        >
                          {busyId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                          Temp Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Access to this console is granted exclusively by the admin_roles table in the database.
        </p>
      </div>
    </div>
  );
}