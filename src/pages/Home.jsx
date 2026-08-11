import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import ToolGrid from '../components/landing/ToolGrid';
import Features from '../components/landing/Features';
import Footer from '../components/landing/Footer';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-500 selection:bg-violet-500/25 selection:text-slate-900 dark:bg-slate-950 dark:text-slate-100 dark:selection:text-white">
      <Header />
      <main className="flex-1">
        <Hero />
        <ToolGrid />
        <Features />
      </main>
      <Footer />
    </div>
  );
}