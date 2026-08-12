import { Outlet } from 'react-router-dom';
import Footer from '../components/landing/Footer';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-200">
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}