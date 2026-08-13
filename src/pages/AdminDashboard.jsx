import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, Ban, ShieldCheck, KeyRound, Loader2, RefreshCw, Copy, CheckCircle2,
  FileText, HardDrive, Activity, UserPlus, ShieldAlert, TrendingUp, Mail, Reply, Trash2,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../components/Toast';

const ROW_COLS = 'id, email, full_name, is_banned, requires_password_reset, created_at';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export default function AdminDashboard() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [tempPassword, setTempPassword] = useState({ userId: null, password: '', email: '' });
  const [copied, setCopied] = useState(false);

  const isSuperAdmin = stats?.current_user_role === 'super_admin';
  const isAdminRow = (row) => (stats?.admin_users ?? []).some((a) => a.user_id === row.id);
  const isSuperAdminRow = (row) =>
    (stats?.admin_users ?? []).some((a) => a.user_id === row.id && a.role_type === 'super_admin');
  const canModerateRow = (row) => !isSuperAdminRow(row) || isSuperAdmin;

  // Merge admin_roles (via admin_get_stats) into the user list so every row
  // clearly carries an isAdmin flag before rendering any moderation actions.
  const usersWithRoles = useMemo(() => {
    const adminIds = new Set((stats?.admin_users ?? []).map((a) => a.user_id));
    return users.map((u) => ({ ...u, isAdmin: adminIds.has(u.id) }));
  }, [users, stats]);

  const todayMessagesCount = messages.filter(
    (m) => new Date(m.created_at).toDateString() === new Date().toDateString()
  ).length;

  // Single source of truth: the admin_roles-gated security-definer RPC.
  // Non-admins get an access-denied error and never receive any data.
  const loadStats = useCallback(() => {
    supabase.rpc('admin_get_stats').then(({ data, error }) => {
      setLoading(false);
      if (error) {
        if (error.code === '42501') setDenied(true);
        toastError(`Could not load statistics: ${error.message}`);
        return;
      }
      setStats(data);
    });
  }, [toastError]);

  const loadUsers = useCallback(() => {
    supabase
      .from('profiles')
      .select(ROW_COLS)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toastError(`Could not load users: ${error.message}`);
          return;
        }
        setUsers(data ?? []);
      });
  }, [toastError]);

  const loadMessages = useCallback(() => {
    supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toastError(`Could not load messages: ${error.message}`);
          return;
        }
        setMessages(data ?? []);
      });
  }, [toastError]);

  useEffect(() => {
    loadStats();
    loadUsers();
    loadMessages();
  }, [loadStats, loadUsers, loadMessages]);

  const refreshAll = () => {
    setLoading(true);
    loadStats();
    loadUsers();
    loadMessages();
  };

  const toggleBan = async (row) => {
    if (row.isAdmin) {
      toastError('Admin roles are protected and cannot be banned.');
      return;
    }
    setBusyId(row.id);
    const { error } = await supabase.rpc('admin_set_banned', {
      p_user_id: row.id,
      p_banned: !row.is_banned,
    });
    setBusyId(null);
    if (error) {
      toastError(error.message);
      return;
    }
    toastSuccess(row.is_banned ? 'User unbanned' : 'User banned');
    refreshAll();
  };

  const toggleAdmin = async (row) => {
    setBusyId(row.id);
    const { error } = await supabase.rpc('admin_toggle_role', {
      p_target_user_id: row.id,
    });
    setBusyId(null);
    if (error) {
      toastError(error.message);
      return;
    }
    toastSuccess(isAdminRow(row) ? 'Admin access revoked' : 'Admin role granted');
    refreshAll();
  };

  const generateTempPassword = async (row) => {
    setBusyId(row.id);
    const { data, error } = await supabase.rpc('admin_reset_password', {
      p_user_id: row.id,
    });
    setBusyId(null);
    if (error) {
      toastError(error.message || 'Failed to generate temporary password');
      return;
    }
    setCopied(false);
    setTempPassword({ userId: row.id, password: data.temp_password, email: row.email });
    refreshAll();
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

  const deleteMessage = async (messageId) => {
    const { error } = await supabase.from('contact_messages').delete().eq('id', messageId);
    if (error) {
      toastError(error.message);
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    toastSuccess('Message deleted');
  };

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.total_users, icon: Users, tone: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
        { label: 'New (7 days)', value: stats.new_users_7d, icon: UserPlus, tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
        { label: 'Admins', value: stats.total_admins, icon: ShieldCheck, tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
        { label: 'Banned', value: stats.banned_users, icon: Ban, tone: 'text-red-600 dark:text-red-400 bg-red-500/10' },
        { label: 'Pending Resets', value: stats.pending_resets, icon: KeyRound, tone: 'text-orange-600 dark:text-orange-400 bg-orange-500/10' },
        { label: 'Documents', value: stats.total_documents, icon: FileText, tone: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
        { label: 'Storage Used', value: formatBytes(stats.total_storage_bytes), icon: HardDrive, tone: 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10' },
        { label: 'Actions (24h)', value: stats.actions_24h, icon: Activity, tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
      ]
    : [];

  const maxToolCount = stats?.top_tools?.length
    ? Math.max(...stats.top_tools.map((t) => t.count), 1)
    : 1;

  if (denied) {
    return (
      <div className="flex-1 bg-white px-6 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-10 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Access denied</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              The database rejected this request — you are not listed in <code className="font-mono">admin_roles</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Statistics via <code className="font-mono text-xs">admin_get_stats()</code> — RBAC enforced by the database.
                {isSuperAdmin ? ' You are a Super Admin.' : ' You are a Sub-Admin.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 px-4 py-2 transition-colors disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
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

        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : stats ? (
          <>
            <section aria-label="Statistics">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
                Statistics
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statCards.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.tone}`}>
                      <card.icon className="h-4.5 w-4.5" />
                    </span>
                    <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{ (card?.value ?? 0).toLocaleString() }</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="Analytics" className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
                <TrendingUp className="h-4 w-4" /> Analytics
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Top tools (all-time actions)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ (stats?.total_actions ?? 0).toLocaleString() } total actions</p>
                  {stats.top_tools.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No tool usage recorded yet.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {stats.top_tools.map((t) => (
                        <li key={t.tool}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-700 capitalize dark:text-slate-300">{t.tool.replace(/-/g, ' ')}</span>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ (t?.count ?? 0).toLocaleString() }</span>
                          </div>
                          <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                              style={{ width: `${(t.count / maxToolCount) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent signups</p>
                  {stats.recent_signups.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No signups yet.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                      {stats.recent_signups.map((s, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{s.email || '—'}</span>
                          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{formatDate(s.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}

        <section aria-label="Contact messages" className="mt-8">
          <h2 className="mb-3 flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
            <Mail className="h-4 w-4 mr-2" /> Contact Messages
            {todayMessagesCount > 0 && (
              <span className="ml-2 rounded-full bg-emerald-500/15 text-emerald-600 px-2 py-0.5 text-[10px] font-bold dark:text-emerald-400">
                +{todayMessagesCount} Today
              </span>
            )}
          </h2>
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900/60">
              <Mail className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">No messages found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900 dark:text-white">{msg.name}</p>
                      <a
                        href={`mailto:${msg.email}`}
                        className="block truncate text-sm text-purple-600 hover:text-purple-700 transition-colors dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        {msg.email}
                      </a>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {msg.created_at ? formatDateTime(msg.created_at) : '—'}
                    </span>
                  </div>
                  <p className="mt-3 break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {msg.message}
                  </p>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => deleteMessage(msg.id)}
                      className="flex items-center gap-1.5 rounded-lg text-red-500 hover:bg-red-500/10 px-3 py-2 text-xs font-bold transition-colors dark:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                    <a
                      href={`mailto:${msg.email}`}
                      className="flex items-center gap-1.5 rounded-lg bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 px-3 py-2 text-xs font-bold transition-colors dark:text-purple-300"
                    >
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-label="User management" className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
            User Management
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
            {users.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-600 dark:text-slate-400">No users found.</p>
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
                  {usersWithRoles.map((row) => (
                    <tr key={row.id} className="border-b border-slate-200/80 last:border-0 hover:bg-slate-100/70 transition-colors dark:border-slate-800/60 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{row.email || '—'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {row.full_name ? `${row.full_name} · ` : ''}
                          <span className="font-mono">{row.id.slice(0, 8)}…</span>
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{row.created_at ? formatDate(row.created_at) : '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {isSuperAdminRow(row) && (
                            <span className="rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold px-2.5 py-1 dark:text-amber-400">Super Admin</span>
                          )}
                          {isAdminRow(row) && !isSuperAdminRow(row) && (
                            <span className="rounded-full bg-violet-500/15 text-violet-600 text-xs font-bold px-2.5 py-1 dark:text-violet-400">Admin</span>
                          )}
                          {row.is_banned && (
                            <span className="rounded-full bg-red-500/15 text-red-600 text-xs font-bold px-2.5 py-1 dark:text-red-400">Banned</span>
                          )}
                          {row.requires_password_reset && (
                            <span className="rounded-full bg-amber-500/15 text-amber-700 text-xs font-bold px-2.5 py-1 dark:text-amber-400">Reset required</span>
                          )}
                          {!row.is_banned && !row.requires_password_reset && !isAdminRow(row) && (
                            <span className="rounded-full bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 dark:bg-slate-700/60 dark:text-slate-300">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isSuperAdmin && !isSuperAdminRow(row) && (
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => toggleAdmin(row)}
                              title={isAdminRow(row) ? 'Revoke admin access' : 'Grant admin access'}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                                isAdminRow(row)
                                  ? 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300'
                                  : 'bg-violet-500/15 text-violet-700 hover:bg-violet-500/25 dark:text-violet-300'
                              }`}
                            >
                              {busyId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              {isAdminRow(row) ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          )}
                          {canModerateRow(row) && !row.isAdmin && (
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
                          )}
                          {row.isAdmin && (
                            <span
                              title="Admin roles are protected and cannot be banned."
                              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-600 dark:text-slate-400"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Protected Role
                            </span>
                          )}
                          {canModerateRow(row) && (
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => generateTempPassword(row)}
                              className="flex items-center gap-1.5 rounded-lg bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 dark:text-purple-300"
                            >
                              {busyId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                              Temp Password
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <p className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Access to this console is granted exclusively by the admin_roles table in the database — the client never sees the service_role key.
        </p>
      </div>
    </div>
  );
}