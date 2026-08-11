import { Link } from 'react-router-dom';
import { TOOLS } from '../../data/tools';

export default function ToolGrid() {
  return (
    <section aria-label="All PDF tools" className="relative mx-auto max-w-6xl px-6 pb-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            to={tool.path}
            className="group glass flex items-center gap-3 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-8px_rgba(139,92,246,0.55)]"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${tool.gradient} text-white shadow-lg shadow-violet-600/25 transition-transform duration-200 group-hover:scale-110`}
            >
              <tool.icon aria-hidden className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-semibold text-slate-900 transition-colors duration-500 dark:text-white">
              {tool.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}