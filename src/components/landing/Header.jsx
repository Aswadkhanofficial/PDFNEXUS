import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, FileStack, LogOut, Menu, X } from 'lucide-react';
import { TOOLS } from '../../data/tools';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

const TABS = [
  { label: 'Home', to: '/', end: true },
  { label: 'Workspace', to: '/workspace', end: false },
];

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toolsRef = useRef(null);

  // Admin entry is offered only when the DB (admin_roles via RLS) says so.
  const tabs = isAdmin ? [...TABS, { label: 'Admin', to: '/admin', end: false }] : TABS;

  const onTools = pathname.startsWith('/tools');
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Account';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const initial = displayName.charAt(0).toUpperCase();
  const isTabActive = (tab) => (tab.end ? pathname === tab.to : pathname.startsWith(tab.to));

  useEffect(() => {
    const onMouseDown = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setToolsOpen(false);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const onPop = () => {
      setToolsOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const closeMenus = () => {
    setToolsOpen(false);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    closeMenus();
    navigate('/');
  };

  const tabClass = (tab) =>
    `relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      isTabActive(tab)
        ? 'bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300'
        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/70 dark:bg-slate-950/70">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="PDFNexus home" onClick={closeMenus}>
          <img src="/logo.png" alt="PDFNexus" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            PDF<span className="gradient-text">Nexus</span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:absolute md:left-1/2 md:-translate-x-1/2 md:flex"
          aria-label="Primary"
        >
          {tabs.map((tab) => (
            <Link key={tab.label} to={tab.to} className={tabClass(tab)} onClick={closeMenus}>
              {tab.label}
            </Link>
          ))}

          <div
            ref={toolsRef}
            className="relative"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((open) => !open)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                onTools
                  ? 'bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Tools
              <ChevronDown
                aria-hidden
                className={`h-4 w-4 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {toolsOpen && (
              <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3" role="menu">
                <div className="grid w-[42rem] grid-cols-2 gap-1.5 rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-2xl shadow-violet-950/30 backdrop-blur-2xl transition-colors duration-500 dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-slate-950/80">
                  {TOOLS.map((tool) => (
                    <Link
                      key={tool.slug}
                      to={tool.path}
                      role="menuitem"
                      onClick={closeMenus}
                      className="group flex items-start gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-violet-500/10 hover:shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)] dark:hover:bg-violet-400/10"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr ${tool.gradient} text-white shadow-lg shadow-violet-600/25 transition-transform duration-200 group-hover:scale-110`}
                      >
                        <tool.icon aria-hidden className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                          {tool.name}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">
                          {tool.blurb}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <ThemeToggle theme={theme} onToggleTheme={toggleTheme} />

          {user ? (
            <div className="hidden items-center gap-2.5 md:flex">
              <Link
                to="/settings"
                title="Profile and settings"
                onClick={closeMenus}
                className="flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 py-1 pl-1 pr-3 transition-all duration-200 hover:shadow-[0_0_18px_-4px_rgba(139,92,246,0.6)]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-xs font-bold text-white">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    initial
                  )}
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="max-w-[9rem] truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {displayName}
                  </span>
                  {isAdmin && (
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-label="Verified admin"
                      title="Verified admin"
                      className="h-4 w-4 shrink-0 text-blue-500"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 dark:text-slate-400"
              >
                <LogOut aria-hidden className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/login"
                onClick={closeMenus}
                className="rounded-full px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-400"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={closeMenus}
                className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/50"
              >
                Get Started
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-transform duration-200 hover:scale-105 md:hidden dark:text-slate-200"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="glass mx-4 mb-4 rounded-2xl p-4 shadow-xl md:hidden dark:shadow-slate-950/80">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                to={tab.to}
                onClick={closeMenus}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-violet-500/10 dark:text-slate-200 dark:hover:bg-violet-400/10"
              >
                {tab.label}
              </Link>
            ))}
            <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tools
            </p>
            {TOOLS.map((tool) => (
              <Link
                key={tool.slug}
                to={tool.path}
                onClick={closeMenus}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-violet-500/10 dark:text-slate-200 dark:hover:bg-violet-400/10"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-tr ${tool.gradient} text-white`}
                >
                  <tool.icon aria-hidden className="h-4 w-4" />
                </span>
                {tool.name}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-800">
            {user ? (
              <>
                <Link
                  to="/settings"
                  onClick={closeMenus}
                  className="rounded-xl bg-slate-200/70 px-4 py-3 text-center text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenus}
                  className="rounded-xl bg-slate-200/70 px-4 py-3 text-center text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMenus}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-violet-600/30"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
