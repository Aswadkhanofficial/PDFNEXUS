import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileStack, LayoutDashboard, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/merge', label: 'Merge PDFs' },
    { path: '/split', label: 'Split PDF' },
    { path: '/convert', label: 'Image to PDF' },
    { path: '/sign', label: 'E-Sign' },
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === path : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors">
          <FileStack className="w-7 h-7 text-purple-500" />
          <span className="text-xl font-black tracking-tight">PDFNexus</span>
        </Link>

        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-semibold transition-colors ${
                isActive(link.path) ? 'text-purple-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  isActive('/dashboard') ? 'text-purple-400' : 'text-slate-300 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> My Documents
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              <LogIn className="w-4 h-4" /> Log In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}