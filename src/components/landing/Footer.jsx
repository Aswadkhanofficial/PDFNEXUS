import { Link } from 'react-router-dom';

const legal = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Contact', to: '/contact' },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/60 backdrop-blur-xl transition-colors duration-500 dark:border-slate-800/70 dark:bg-slate-950/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <nav className="flex items-center gap-6" aria-label="Legal">
          {legal.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-slate-500 transition-colors hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-slate-500 transition-colors duration-500 dark:text-slate-500">
          © 2026 PDFNexus, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}