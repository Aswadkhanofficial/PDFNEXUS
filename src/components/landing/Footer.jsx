import { Link } from 'react-router-dom';

const legal = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Contact Us', to: '/contact' },
];

export default function Footer() {
  return (
    <footer className="pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 mt-10 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © 2026 PDFNexus, Inc. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Legal">
            {legal.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}