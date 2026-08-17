import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { TOOLS } from '../../data/tools';

const RADIUS = 170;
const ORBIT_DURATION = 60;
const COUNT = TOOLS.length;

export default function ToolEcosystem() {
  return (
    <section className="flex w-full flex-col items-center justify-center">
      <div className="grid w-full max-w-xl grid-cols-2 gap-4 p-4 md:hidden">
        {TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            to={tool.path}
            className="group flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/80 px-3 py-4 text-center shadow-lg shadow-violet-600/20 backdrop-blur transition-all duration-300 hover:border-violet-500/60 dark:border-white/10 dark:bg-slate-900/80"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${tool.gradient} text-white shadow-md shadow-violet-600/25 transition-transform duration-300 group-hover:scale-110`}
            >
              <tool.icon aria-hidden className="h-5 w-5" />
            </span>
            <span className="break-words text-xs font-semibold leading-tight text-slate-700 transition-colors duration-300 group-hover:text-violet-600 dark:text-slate-300 dark:group-hover:text-violet-400">
              {tool.name}
            </span>
          </Link>
        ))}
      </div>

      <div className="relative hidden h-[500px] w-[500px] items-center justify-center md:flex">
        <div
          aria-hidden
          className="absolute h-[380px] w-[380px] rounded-full border border-violet-500/10 dark:border-violet-400/10"
        />
        <div
          aria-hidden
          className="absolute h-[280px] w-[280px] rounded-full border border-dashed border-violet-500/20 dark:border-violet-400/20"
        />
        <div
          aria-hidden
          className="absolute h-40 w-40 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-400/15"
        />

        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: ORBIT_DURATION, repeat: Infinity, ease: 'linear' }}
        >
          {TOOLS.map((tool, index) => {
            const angle = (index * 360) / COUNT;
            const radians = (angle * Math.PI) / 180;
            const x = RADIUS * Math.cos(radians);
            const y = RADIUS * Math.sin(radians);

            return (
              <motion.div
                key={tool.slug}
                className="group absolute left-1/2 top-1/2 -ml-10 -mt-10"
                style={{ translateX: x, translateY: y }}
                animate={{ rotate: -360 }}
                transition={{ duration: ORBIT_DURATION, repeat: Infinity, ease: 'linear' }}
              >
                <Link
                  to={tool.path}
                  aria-label={tool.name}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-white/40 bg-white/80 shadow-lg shadow-violet-600/20 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/60 hover:shadow-[0_0_34px_-8px_rgba(139,92,246,0.6)] dark:border-white/10 dark:bg-slate-900/80"
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr ${tool.gradient} text-white shadow-md shadow-violet-600/25 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <tool.icon aria-hidden className="h-5 w-5" />
                  </span>
                </Link>
                <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tracking-wide text-slate-500 transition-colors duration-300 group-hover:text-violet-600 dark:text-slate-400 dark:group-hover:text-violet-400">
                  {tool.name}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-white/40 bg-white/80 shadow-lg shadow-violet-600/20 backdrop-blur dark:border-white/10 dark:bg-slate-900/80"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src="/logo.png"
            alt="PDFNexus Hub"
            className="w-full h-full object-cover rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)]"
          />
        </motion.div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors duration-500 dark:text-slate-400">
        <ShieldCheck aria-hidden className="h-4 w-4 text-emerald-500" />
        Eight tools orbit one hub — all processing stays on your device
      </p>
    </section>
  );
}