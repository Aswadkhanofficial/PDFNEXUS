import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { TOOLS } from '../../data/tools';

export default function ToolSuite() {
  return (
    <section id="tools" className="relative overflow-hidden py-16 sm:py-20">
      <div
        aria-hidden
        className="animate-drift-d pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/10"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-600 transition-colors duration-500 dark:text-violet-400">
            The Full Toolkit
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 transition-colors duration-500 dark:text-white sm:text-4xl">
            Everything you need to <span className="gradient-text text-glow">manage PDFs</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 transition-colors duration-500 dark:text-slate-400">
            Eight production-grade tools, one private workspace. Pick a tool and
            start — no account, no queue, no files leaving your device.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              to={tool.path}
              className="group glass relative flex flex-col overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/50 hover:bg-white/90 hover:shadow-[0_0_34px_-8px_rgba(139,92,246,0.55)] dark:hover:bg-slate-900/90"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:bg-violet-400/10"
              />
              <div className="relative flex items-start justify-between">
                <span
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${tool.gradient} text-white shadow-lg shadow-violet-600/25 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110`}
                >
                  <tool.icon aria-hidden className="h-6 w-6" />
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="h-5 w-5 text-slate-400 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-500 group-hover:opacity-100 dark:text-slate-500 dark:group-hover:text-violet-400"
                />
              </div>
              <h3 className="font-display text-base font-semibold text-slate-900 transition-colors duration-500 dark:text-white">
                {tool.name}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 transition-colors duration-500 dark:text-slate-400">
                {tool.blurb}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}