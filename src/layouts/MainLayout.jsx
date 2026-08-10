import Header from '../components/Header';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}