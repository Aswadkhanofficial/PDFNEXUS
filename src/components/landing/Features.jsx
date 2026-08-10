import { Infinity as InfinityIcon, ShieldCheck, Zap } from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Client-Side Privacy',
    copy: 'Your documents never leave your device. Every byte is processed locally in your browser — close the tab and every trace is gone.',
    accent: 'text-violet-500 dark:text-violet-400',
    glow: 'bg-violet-500',
  },
  {
    icon: Zap,
    title: 'Lightning Speed',
    copy: 'Merging, splitting, compressing and e-signing are instant. Pioneering in-browser performance tuned for work, not weekends.',
    accent: 'text-indigo-500 dark:text-indigo-400',
    glow: 'bg-indigo-500',
  },
  {
    icon: InfinityIcon,
    title: 'Unlimited Access',
    copy: 'No file size caps, no daily quotas, no per-document paywalls. Every core tool is free — use them as much as you need.',
    accent: 'text-fuchsia-500 dark:text-fuchsia-400',
    glow: 'bg-fuchsia-500',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-24 sm:py-28">
      <div
        aria-hidden
        className="animate-drift-d pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/10"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-600 transition-colors duration-500 dark:text-violet-400">
            Why PDFNexus
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 transition-colors duration-500 dark:text-white sm:text-4xl">
            Private by design. <span className="gradient-text">Fast by default.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 transition-colors duration-500 dark:text-slate-400">
            Everything runs in your browser. No uploads, no servers, no waiting — just
            tools that respect your documents as much as you do.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="glass group relative overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-violet-600/10 dark:hover:shadow-violet-500/10"
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full ${feature.glow}/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
              />
              <div className="relative">
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-tr from-violet-500/15 to-indigo-500/15 ${feature.accent} transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110`}
                >
                  <feature.icon aria-hidden className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900 transition-colors duration-500 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600 transition-colors duration-500 dark:text-slate-400">
                  {feature.copy}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}