import Header from '../components/Header';
import RequireResetWall from '../components/RequireResetWall';

export default function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-200">
      <Header />
      <main className="flex flex-1 flex-col">
        <RequireResetWall>{children}</RequireResetWall>
      </main>
    </div>
  );
}