import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Loader2, CheckCircle2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import GoogleButton from '../components/GoogleButton';

const PASSWORD_ERROR =
  'Password must be at least 6 characters long and include a special character (e.g., @, #, *).';
const PASSWORD_REGEX = /^(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;

const validatePassword = (password) => PASSWORD_REGEX.test(password);

const isPasswordPolicyError = (message = '') =>
  /password/i.test(message) &&
  /(special|charact|at least|number|uppercase|lowercase)/i.test(message);

export default function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) window.location.assign('/');
    });
  }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setErrorMsg(error.message);
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validatePassword(formData.password)) {
      setErrorMsg(PASSWORD_ERROR);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.name } }
      });

      if (error) throw error;
      setIsSuccess(true);
      
    } catch (error) {
      setErrorMsg(isPasswordPolicyError(error.message) ? PASSWORD_ERROR : error.message);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-10 shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300 dark:bg-slate-900 dark:border-slate-800">
          <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/20 dark:text-green-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2 dark:text-white">Check your email</h2>
          <p className="text-slate-600 mb-8 dark:text-slate-400">
            We've sent a verification link to <span className="text-slate-900 font-medium dark:text-white">{formData.email}</span>. Please verify your account to unlock unlimited access.
          </p>
          
          {providerLink ? (
            <a 
              href={providerLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-all shadow-[0_0_24px_rgba(139,92,246,0.4)] mb-4 gap-2"
            >
              Open Inbox <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-500/10 p-3 rounded-lg mb-4 w-full dark:text-amber-400">
              Please open your email app to verify your account.
            </p>
          )}

          <button onClick={() => window.location.reload()} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">
            Didn't receive it? Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      
      <div className="max-w-md w-full mb-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
        <div className="bg-purple-500/20 p-2 rounded-lg"><Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
        <div>
          <h3 className="text-purple-700 font-bold text-sm dark:text-purple-300">Hit your 3-file limit?</h3>
          <p className="text-slate-600 text-xs mt-1 dark:text-slate-400">Free users can only merge 3 times. Create an account now to completely remove all limits and save your work securely.</p>
        </div>
      </div>

      <div className="max-w-md w-full bg-white backdrop-blur-xl border border-slate-200 rounded-2xl p-8 shadow-2xl shadow-slate-200/60 relative overflow-hidden dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-slate-950/60">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent"></div>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight dark:text-white">Create Account</h2>
          <p className="text-sm text-slate-600 mt-2 dark:text-slate-400">Join PDFNexus for unlimited access.</p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg mb-6 text-sm font-medium bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <GoogleButton onClick={handleGoogleSignIn} loading={isGoogleLoading} disabled={isLoading} />

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <User className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" required className="w-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm dark:bg-slate-950 dark:border-slate-800" />
          </div>
          
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address" required className="w-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm dark:bg-slate-950 dark:border-slate-800" />
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
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm dark:bg-slate-950 dark:border-slate-800" 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex justify-center items-center transition-all duration-300 shadow-lg shadow-violet-600/30 hover:shadow-xl hover:shadow-violet-600/50 mt-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up & Unlock Limits"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6 dark:text-slate-400">
          Already have an account? <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium dark:text-purple-400 dark:hover:text-purple-300">Log in</Link>
        </p>
      </div>
    </div>
  );
}