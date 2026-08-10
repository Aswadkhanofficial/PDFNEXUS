import { Link } from 'react-router-dom';
import { FileStack } from 'lucide-react';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Merge PDFs', to: '/merge' },
      { label: 'Split PDF', to: '/split' },
      { label: 'Compress PDF', to: '/compress' },
      { label: 'Rotate PDF', to: '/rotate' },
      { label: 'Watermark PDF', to: '/watermark' },
      { label: 'Reorder Pages', to: '/reorder' },
      { label: 'Image to PDF', to: '/convert' },
      { label: 'E-Sign Document', to: '/sign' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Contact Us', to: '/contact' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/60 backdrop-blur-xl transition-colors duration-500 dark:border-slate-800/70 dark:bg-slate-950/60">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link to="/" className="flex items-center gap-3" aria-label="PDFNexus home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/25">
                <FileStack aria-hidden className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-bold tracking-tight text-slate-900 transition-colors duration-500 dark:text-white">
                PDF<span className="gradient-text">Nexus</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500 transition-colors duration-500 dark:text-slate-400">
              Merge, split, compress, rotate, watermark, reorder and e-sign PDFs in
              your browser — private by design, free forever.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title} className="md:col-span-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 transition-colors duration-500 dark:text-white">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-slate-500 transition-colors duration-200 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-8 transition-colors duration-500 dark:border-slate-800/70 sm:flex-row">
          <p className="text-xs text-slate-500 transition-colors duration-500 dark:text-slate-500">
            © 2026 PDFNexus, Inc. All rights reserved.
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-500 transition-colors duration-500 dark:text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  );
}