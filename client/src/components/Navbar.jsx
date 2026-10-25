import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Video, Sun, Moon, LogIn, LogOut, Settings, 
  ShieldAlert, Calendar, LayoutDashboard, Copy, Check, ChevronDown
} from 'lucide-react';

export default function Navbar({ onOpenAuth, onOpenSettings, onNavigate, currentPage }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedPmi, setCopiedPmi] = useState(false);

  const copyPmi = (e) => {
    e.stopPropagation();
    if (user?.pmi) {
      navigator.clipboard.writeText(`${window.location.origin}/?meeting=${user.pmi}`);
      setCopiedPmi(true);
      setTimeout(() => setCopiedPmi(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            src="/logo.png"
            alt="Nexvora Solutions Logo"
            className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 ring-2 ring-blue-500/20 shadow-md group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                Nexvora
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                MEET
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-1 hidden sm:block">
              Nexvora Solutions • Innovating Beyond Tomorrow
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => onNavigate('home')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              currentPage === 'home'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Home
          </button>
          
          {isAuthenticated && (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  currentPage === 'dashboard'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>

              <button
                onClick={() => onNavigate('schedule')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  currentPage === 'schedule'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    currentPage === 'admin'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  Admin
                </button>
              )}
            </>
          )}
        </nav>

        {/* Right Action Icons & User Dropdown */}
        <div className="flex items-center gap-3">
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* User Profile / Auth State */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover ring-2 ring-blue-500/30"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 max-w-[100px] truncate hidden sm:block">
                  {user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div 
                  onClick={() => setDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-2 px-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <div className="mt-2 flex items-center justify-between p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-xs border border-blue-100 dark:border-blue-900/60">
                      <span className="text-blue-700 dark:text-blue-300 font-mono font-medium">PMI: {user.pmi}</span>
                      <button 
                        onClick={copyPmi}
                        title="Copy Personal Meeting Link"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1"
                      >
                        {copiedPmi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => onNavigate('dashboard')}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-400" />
                      Dashboard & Meetings
                    </button>
                    
                    <button
                      onClick={onOpenSettings}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Settings & Devices
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => onNavigate('admin')}
                        className="w-full text-left px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg flex items-center gap-2 font-medium"
                      >
                        <ShieldAlert className="w-4 h-4 text-indigo-500" />
                        Admin Console
                      </button>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
