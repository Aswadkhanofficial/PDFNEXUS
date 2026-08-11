import { Link } from 'react-router-dom';

const links = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Contact Us', to: '/contact' },
];

export default function LegalFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-slate-600 dark:text-slate-500">© 2026 PDFNexus, Inc. All rights reserved.</p>
        <nav className="flex items-center gap-5">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}