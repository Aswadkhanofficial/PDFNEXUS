import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import ToolSuite from '../components/landing/ToolSuite';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-500 selection:bg-violet-500/25 selection:text-slate-900 dark:bg-slate-950 dark:text-slate-100 dark:selection:text-white">
      <Header />
      <main className="flex-1">
        <Hero />
        <ToolSuite />
      </main>
    </div>
  );
}