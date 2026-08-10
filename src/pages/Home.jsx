import useTheme from '../hooks/useTheme';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Footer from '../components/landing/Footer';

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-500 selection:bg-violet-500/25 selection:text-slate-900 dark:bg-slate-950 dark:text-slate-100 dark:selection:text-white">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}