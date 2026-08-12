import ProfileSettings from '../components/ProfileSettings';

export default function Settings() {
  return (
    <div className="relative w-full max-w-3xl mx-auto px-6 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-24 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl animate-drift-a"
      />
      <div className="relative mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-600 dark:text-violet-400">
          Account
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Profile Settings
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Manage your name and profile photo — changes appear instantly across PDFNexus.
        </p>
      </div>
      <ProfileSettings />
    </div>
  );
}