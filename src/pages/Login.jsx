import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      navigate('/dashboard');
      
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 relative overflow-hidden dark:bg-slate-950 dark:text-slate-200">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
      
      <div className="max-w-md w-full mb-6 bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between relative dark:bg-slate-900 dark:border-slate-800">
        <div>
          <h3 className="text-slate-800 font-bold text-sm dark:text-slate-200">Welcome back!</h3>
          <p className="text-slate-600 text-xs mt-1 dark:text-slate-400">Log in to continue your unlimited access.</p>
        </div>
      </div>

      <div className="max-w-md w-full bg-white backdrop-blur-xl border border-slate-200 rounded-2xl p-8 shadow-2xl shadow-slate-200/60 relative overflow-hidden dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-slate-950/60">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent"></div>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight dark:text-white">Log In</h2>
          <p className="text-sm text-slate-600 mt-2 dark:text-slate-400">Access your PDFNexus workspace.</p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg mb-6 text-sm font-medium bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address" required className="w-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm dark:bg-slate-950 dark:border-slate-800" />
          </div>

          <div className="relative">
            <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              value={formData.password} 
              onChange={handleInputChange} 
              placeholder="Password" 
              required 
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm dark:bg-slate-950 dark:border-slate-800" 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer appearance-none w-4 h-4 border border-slate-300 rounded bg-white checked:bg-purple-600 checked:border-purple-600 transition-colors cursor-pointer dark:border-slate-600 dark:bg-slate-950" 
                />
                <CheckCircle2 className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
              </div>
              <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors select-none dark:text-slate-400 dark:group-hover:text-slate-300">Remember me</span>
            </label>
            <Link to="#" className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors dark:text-purple-400 dark:hover:text-purple-300">Forgot Password?</Link>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-all duration-300 shadow-lg shadow-violet-600/30 hover:shadow-xl hover:shadow-violet-600/50 mt-4">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Log In securely <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6 dark:text-slate-400">
          Don't have an account? <Link to="/signup" className="text-purple-600 hover:text-purple-700 font-medium dark:text-purple-400 dark:hover:text-purple-300">Sign up</Link>
        </p>
      </div>
    </div>
  );
}