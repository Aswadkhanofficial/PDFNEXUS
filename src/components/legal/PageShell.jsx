import { Link } from 'react-router-dom';
import { FileStack, ArrowLeft } from 'lucide-react';
import LegalFooter from './LegalFooter';

export function LegalSection({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{children}</div>
    </section>
  );
}

export default function PageShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-4 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            <FileStack className="w-6 h-6 text-purple-500" />
            <span className="text-lg font-black tracking-tight">PDFNexus</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-500 mt-2">{subtitle}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-2xl space-y-8 dark:bg-slate-900 dark:border-slate-800">
          {children}
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}