import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Loader2, CheckCircle2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.name } }
      });

      if (error) throw error;
      setIsSuccess(true);
      
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmailProviderLink = () => {
    const email = formData.email.toLowerCase();
    if (email.endsWith('@gmail.com')) return 'https://mail.google.com';
    if (email.endsWith('@yahoo.com') || email.endsWith('@ymail.com')) return 'https://mail.yahoo.com';
    if (email.endsWith('@outlook.com') || email.endsWith('@hotmail.com')) return 'https://outlook.live.com';
    return null;
  };

  if (isSuccess) {
    const providerLink = getEmailProviderLink();
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-200">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-10 shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Check your email</h2>
          <p className="text-slate-400 mb-8">
            We've sent a verification link to <span className="text-white font-medium">{formData.email}</span>. Please verify your account to unlock unlimited access.
          </p>
          
          {providerLink ? (
            <a 
              href={providerLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] mb-4 gap-2"
            >
              Open Inbox <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <p className="text-sm text-amber-400 bg-amber-400/10 p-3 rounded-lg mb-4 w-full">
              Please open your email app to verify your account.
            </p>
          )}

          <button onClick={() => window.location.reload()} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            Didn't receive it? Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
      
      <div className="max-w-md w-full mb-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
        <div className="bg-purple-500/20 p-2 rounded-lg"><Lock className="w-5 h-5 text-purple-400" /></div>
        <div>
          <h3 className="text-purple-300 font-bold text-sm">Hit your 3-file limit?</h3>
          <p className="text-slate-400 text-xs mt-1">Free users can only merge 3 times. Create an account now to completely remove all limits and save your work securely.</p>
        </div>
      </div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="text-sm text-slate-400 mt-2">Join PDFNexus for unlimited access.</p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg mb-6 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <User className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" required className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm" />
          </div>
          
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address" required className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm" />
          </div>

          <div className="relative">
            <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              value={formData.password} 
              onChange={handleInputChange} 
              placeholder="Create Password" 
              required 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm" 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex justify-center items-center transition-all shadow-lg shadow-purple-600/20 mt-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up & Unlock Limits"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account? <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}