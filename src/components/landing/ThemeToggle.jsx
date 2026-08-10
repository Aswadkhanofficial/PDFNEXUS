import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ theme, onToggleTheme }) {
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Toggle dark mode"
      onClick={onToggleTheme}
      className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full border transition-colors duration-300 ${
        dark
          ? 'border-slate-700 bg-slate-800'
          : 'border-slate-300 bg-slate-200'
      }`}
    >
      <Sun
        aria-hidden
        className={`absolute left-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500 transition-all duration-300 ${
          dark ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
      />
      <Moon
        aria-hidden
        className={`absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300 transition-all duration-300 ${
          dark ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      />
      <span
        aria-hidden
        className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
          dark ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}