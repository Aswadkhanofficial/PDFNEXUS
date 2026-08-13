import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, LayoutGrid, ShieldCheck, Sparkles } from 'lucide-react';
import ToolEcosystem from './ToolEcosystem';

const stats = [
  { value: '8', label: 'free PDF tools' },
  { value: '0', label: 'uploads — ever' },
  { value: '100%', label: 'client-side processing' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_72%)]"
      />
      <div
        aria-hidden
        className="animate-drift-a pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-600/20"
      />
      <div
        aria-hidden
        className="animate-drift-b pointer-events-none absolute -right-40 top-16 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-500/20"
      />
      <div
        aria-hidden
        className="animate-drift-c pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl dark:bg-fuchsia-500/15"
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-12 pt-12 text-center sm:pt-16">
        <div
          className="animate-rise glass mb-8 inline-flex items-center gap-2.5 rounded-full border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-700 shadow-[0_0_24px_-6px_rgba(139,92,246,0.5)] dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300"
          style={{ animationDelay: '0s' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
          </span>
          <Sparkles aria-hidden className="h-4 w-4" />
          Private by design — every tool runs in your browser
        </div>

        <h1
          className="animate-rise font-display text-5xl font-bold leading-[1.08] tracking-tight text-slate-900 transition-colors duration-500 dark:text-white sm:text-6xl lg:text-7xl"
          style={{ animationDelay: '0.1s' }}
        >
          The Ultimate 8-in-1
          <br className="hidden sm:block" />
          PDF Workspace
          <span className="gradient-text text-glow block pb-2 pt-2">
            Fast. Secure. 100% Private.
          </span>
        </h1>

        <p
          className="animate-rise mt-6 max-w-2xl text-base leading-relaxed text-slate-600 transition-colors duration-500 dark:text-slate-400 sm:text-lg"
          style={{ animationDelay: '0.2s' }}
        >
          PDFNexus is the private, production-grade PDF workspace. Merge, Split,
          Compress, Protect, E-Sign, Convert, Unlock and Watermark PDFs directly in
          your browser — files never touch a server, so they never leave your hands.
        </p>

        <div
          className="animate-rise mt-10 flex w-full max-w-md flex-col items-center justify-center gap-4 sm:max-w-none sm:flex-row"
          style={{ animationDelay: '0.3s' }}
        >
          <Link to="/workspace" className="btn-primary group w-full sm:w-auto">
            <LayoutGrid aria-hidden className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
            Open Workspace
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <a href="#tools" className="btn-secondary group w-full sm:w-auto">
            Explore All Tools
            <ArrowDown aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" />
          </a>
        </div>

        <p
          className="animate-rise mt-6 flex items-center gap-2 text-sm text-slate-500 transition-colors duration-500 dark:text-slate-500"
          style={{ animationDelay: '0.4s' }}
        >
          <ShieldCheck aria-hidden className="h-4 w-4 text-emerald-500" />
          Client-side processing — your documents never upload
        </p>

        <div
          className="animate-rise mt-10 flex items-center justify-center gap-6 sm:gap-10"
          style={{ animationDelay: '0.5s' }}
        >
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center gap-6 sm:gap-10">
              {index > 0 && (
                <span
                  aria-hidden
                  className="hidden h-8 w-px bg-slate-300/70 sm:block dark:bg-slate-700/70"
                />
              )}
              <div className="text-center">
                <p className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <ToolEcosystem />
      </div>
    </section>
  );
}