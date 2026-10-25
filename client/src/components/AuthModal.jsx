import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User, Shield, GraduationCap, AlertCircle, Sparkles } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, googleLogin } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  // Initialize Google Identity Services if script is loaded
  useEffect(() => {
    if (!isOpen) return;

    // Load Google GIS script if not present
    if (!window.google && !document.getElementById('google-gis-script')) {
      const script = document.createElement('script');
      script.id = 'google-gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleButton();
      document.body.appendChild(script);
    } else if (window.google) {
      initGoogleButton();
    }
  }, [isOpen]);

  const initGoogleButton = () => {
    try {
      if (window.google && googleBtnRef.current) {
        // Use environment client ID or demo client ID
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1047123985472-demo.apps.googleusercontent.com';
        
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'pill'
        });
      }
    } catch (e) {
      console.warn('Google GSI init note:', e);
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      let gName = 'Google User';
      let gEmail = 'user@nexvora.com';
      let gAvatar = '';

      if (response.credential) {
        try {
          const decoded = jwtDecode(response.credential);
          gName = decoded.name || 'Google User';
          gEmail = decoded.email || 'user@nexvora.com';
          gAvatar = decoded.picture || '';
        } catch (e) {}
      }

      await googleLogin(gName, gEmail, gAvatar, response.credential);
      onClose();
    } catch (err) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
      onClose();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const randomSeed = Math.floor(Math.random() * 1000);
      await googleLogin(
        `Google User #${randomSeed}`,
        `google_user${randomSeed}@gmail.com`,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=google_${randomSeed}`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors absolute top-5 right-5"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Nexvora Solutions Logo & Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-block p-1.5 rounded-2xl bg-white shadow-md border border-slate-100 dark:border-slate-800 mb-2">
            <img
              src="/logo.png"
              alt="Nexvora Solutions Logo"
              className="w-14 h-14 object-contain rounded-xl"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {tab === 'login' ? 'Welcome to Nexvora' : 'Join Nexvora Solutions'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Innovating Beyond Tomorrow • Free Video & Classes
          </p>
        </div>

        {/* Quick Demo Access Pills */}
        <div className="mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            1-Click Instant Profiles
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@nexvora.com', 'admin123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-sm transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Profile</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('teacher@nexvora.com', 'demo123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-sm transition-all"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Host / Teacher</span>
            </button>
          </div>
        </div>

        {/* Real Google Identity Services Button Container */}
        <div className="mb-3">
          <div ref={googleBtnRef} className="w-full flex justify-center min-h-[40px]" />
          
          {/* Direct Google Button trigger (always works out-of-the-box) */}
          <button
            type="button"
            onClick={handleSimulateGoogle}
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-3 py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium text-xs shadow-sm transition-all"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Account</span>
          </button>
        </div>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-semibold">
            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">or with email</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-3">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'register' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Amanda Perera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Free Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
