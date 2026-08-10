import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, FileStack, PenTool, ShieldCheck, Sparkles } from 'lucide-react';

const stats = [
  { value: '8', label: 'free PDF tools' },
  { value: '0', label: 'uploads — ever' },
  { value: '100%', label: 'client-side processing' },
];

function DocCard({ tone }) {
  const chip =
    tone === 'violet'
      ? 'bg-violet-500/15 text-violet-500 dark:text-violet-400'
      : 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400';

  return (
    <div className="glass h-32 w-40 rounded-2xl p-3 shadow-lg shadow-slate-950/10 dark:shadow-slate-950/60">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${chip}`}>
          <FileStack aria-hidden className="h-4 w-4" />
        </span>
        <span className="h-2 w-16 rounded-full bg-slate-300/80 dark:bg-slate-700" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-1.5 w-full rounded-full bg-slate-200/90 dark:bg-slate-700/70" />
        <div className="h-1.5 w-4/5 rounded-full bg-slate-200/90 dark:bg-slate-700/70" />
        <div className="h-1.5 w-3/5 rounded-full bg-slate-200/90 dark:bg-slate-700/70" />
      </div>
    </div>
  );
}

function MergeDemo() {
  return (
    <div className="mt-16 w-full max-w-lg">
      <div className="glass relative h-64 overflow-hidden rounded-3xl shadow-2xl shadow-slate-950/10 dark:shadow-slate-950/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-500/10 to-transparent"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-40 w-48">
            <div className="merge-a absolute left-1/2 -ml-20">
              <DocCard tone="violet" />
            </div>
            <div className="merge-b absolute left-1/2 -ml-20 top-2">
              <DocCard tone="indigo" />
            </div>
            <div className="merge-result absolute left-1/2 top-0 -ml-[5.5rem]">
              <div className="glass h-36 w-44 rounded-2xl p-3 shadow-xl shadow-slate-950/15 dark:shadow-slate-950/70">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white">
                    <FileStack aria-hidden className="h-4 w-4" />
                  </span>
                  <span className="h-2 w-20 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-1.5 w-full rounded-full bg-slate-200/90 dark:bg-slate-700/70" />
                  <div className="h-1.5 w-4/5 rounded-full bg-slate-200/90 dark:bg-slate-700/70" />
                  <div className="h-1.5 w-3/5 rounded-full bg-slate-200/90 dark:bg-slate-700/70" />
                </div>
                <span className="merge-check absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/40">
                  <CircleCheck aria-hidden className="h-5 w-5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition-colors duration-500 dark:text-slate-400">
        <CircleCheck aria-hidden className="h-4 w-4 text-emerald-500" />
        Merged 2 files to one — 0.4s, entirely on your device
      </p>
    </div>
  );
}

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

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-36 text-center sm:pt-40">
        <div className="glass mb-8 inline-flex items-center gap-2.5 rounded-full border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
          </span>
          <Sparkles aria-hidden className="h-4 w-4" />
          Private by design — every tool runs in your browser
        </div>

        <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight text-slate-900 transition-colors duration-500 dark:text-white sm:text-6xl lg:text-7xl">
          Merge, Split, Compress &amp; Sign PDFs
          <span className="gradient-text animate-gradient-x block pb-2 pt-2">
            without leaving your device.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 transition-colors duration-500 dark:text-slate-400 sm:text-lg">
          PDFNexus is the private, production-grade PDF workspace. Merge, split,
          compress, rotate, watermark, reorder and e-sign documents directly in your
          browser — files never touch a server, so they never leave your hands.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col items-center justify-center gap-4 sm:max-w-none sm:flex-row">
          <Link to="/merge" className="btn-primary group w-full sm:w-auto">
            <FileStack aria-hidden className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
            Merge PDFs Now
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link to="/sign" className="btn-secondary group w-full sm:w-auto">
            <PenTool aria-hidden className="h-5 w-5 text-violet-500 transition-transform duration-300 group-hover:-rotate-12 dark:text-violet-400" />
            E-Sign Document
          </Link>
        </div>

        <p className="mt-6 flex items-center gap-2 text-sm text-slate-500 transition-colors duration-500 dark:text-slate-500">
          <ShieldCheck aria-hidden className="h-4 w-4 text-emerald-500" />
          Client-side processing — your documents never upload
        </p>

        <div className="mt-10 flex items-center justify-center gap-6 sm:gap-10">
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

        <MergeDemo />
      </div>
    </section>
  );
}