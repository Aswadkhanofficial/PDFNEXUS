import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileStack, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { label: 'Features', href: '#features', anchor: true },
  { label: 'Merge PDFs', to: '/merge' },
  { label: 'E-Sign', to: '/sign' },
];

export default function Header({ theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? 'border-slate-200/80 bg-white/80 shadow-lg shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-slate-950/50'
          : 'border-transparent bg-white/40 dark:bg-slate-950/40'
      }`}
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="group flex items-center gap-3" aria-label="PDFNexus home">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <FileStack aria-hidden className="h-6 w-6" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-slate-900 transition-colors duration-300 dark:text-white">
            PDF<span className="gradient-text">Nexus</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {navLinks.map((link) =>
            link.anchor ? (
              <a
                key={link.label}
                href={link.href}
                className="relative py-1 text-sm font-semibold text-slate-600 transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-violet-500 after:transition-transform after:duration-300 hover:text-slate-900 hover:after:scale-x-100 dark:text-slate-300 dark:hover:text-white"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.to}
                className="relative py-1 text-sm font-semibold text-slate-600 transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-violet-500 after:transition-transform after:duration-300 hover:text-slate-900 hover:after:scale-x-100 dark:text-slate-300 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />

          <Link
            to="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition-colors duration-300 hover:text-violet-600 sm:inline-block dark:text-slate-300 dark:hover:text-violet-400"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/40 sm:inline-block"
          >
            Get Started
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="glass flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-transform duration-200 hover:scale-105 md:hidden dark:text-slate-200"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="glass mx-4 mb-4 rounded-2xl p-4 shadow-xl md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navLinks.map((link) =>
              link.anchor ? (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-800">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl bg-slate-200/70 px-4 py-3 text-center text-sm font-bold text-slate-800 transition-colors hover:bg-slate-300/70 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-violet-600/25"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}