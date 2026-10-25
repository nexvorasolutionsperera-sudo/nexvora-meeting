import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Video, Plus, Calendar, ScreenShare, ArrowRight, Copy, Check,
  Sparkles, Shield, Users, MessageSquare, Hand, PenTool, Lock,
  Clock, CheckCircle2, Play
} from 'lucide-react';
import { api } from '../services/api';

export default function Home({ onStartMeeting, onOpenSchedule, onOpenAuth, onNavigate }) {
  const { user, isAuthenticated } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [copiedPmi, setCopiedPmi] = useState(false);
  const [loadingInstant, setLoadingInstant] = useState(false);

  const handleStartInstant = async () => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setLoadingInstant(true);
    try {
      const meeting = await api.createMeeting({
        title: `${user.name}'s Instant Meeting`,
        isInstant: true,
        waitingRoomEnabled: false,
        allowScreenShare: true,
        allowChat: true
      });
      onStartMeeting(meeting.id);
    } catch (err) {
      console.error(err);
      // fallback to random id
      const randomId = 'nex-' + Math.floor(100 + Math.random() * 900) + '-' + Math.floor(100 + Math.random() * 900);
      onStartMeeting(randomId);
    } finally {
      setLoadingInstant(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    let code = joinCode.trim();
    if (code.includes('meeting=')) {
      code = code.split('meeting=')[1].split('&')[0];
    } else if (code.includes('/')) {
      code = code.split('/').pop();
    }
    onStartMeeting(code);
  };

  const copyPmiLink = () => {
    if (!user?.pmi) return;
    const link = `${window.location.origin}/?meeting=${user.pmi}`;
    navigator.clipboard.writeText(link);
    setCopiedPmi(true);
    setTimeout(() => setCopiedPmi(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Hero Header Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-blue-500/10 via-indigo-500/15 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img
                src="/logo.png"
                alt="Nexvora Solutions Logo"
                className="w-14 h-14 object-contain rounded-2xl bg-white p-1 shadow-lg ring-4 ring-blue-500/20"
              />
              <div className="text-left">
                <span className="font-extrabold text-sm tracking-wide text-slate-800 dark:text-slate-200 block uppercase">
                  Nexvora Solutions
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider block">
                  INNOVATING BEYOND TOMORROW
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-4 shadow-sm animate-in fade-in zoom-in duration-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Free Zoom Alternative for Video Meetings & Online Classes</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Seamless Video Calls,{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400 bg-clip-text text-transparent">
                Collaborative Classes
              </span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect instantly with HD video, high-clarity audio, screen sharing, live chat, interactive whiteboard, waiting rooms, and host moderation — 100% free with no time limits.
            </p>
          </div>

          {/* Zoom-Style Action Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
            
            {/* New Meeting */}
            <button
              onClick={handleStartInstant}
              disabled={loadingInstant}
              className="flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/20 hover:scale-[1.03] active:scale-95 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:rotate-6 transition-transform">
                <Video className="w-7 h-7" />
              </div>
              <span className="font-bold text-base">New Meeting</span>
              <span className="text-xs text-orange-100 mt-0.5">Start instant room</span>
            </button>

            {/* Join Meeting */}
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/20 group relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7" />
              </div>
              <span className="font-bold text-base">Join Meeting</span>
              <span className="text-xs text-blue-100 mt-0.5">Via code or link</span>
            </div>

            {/* Schedule */}
            <button
              onClick={() => {
                if (!isAuthenticated) onOpenAuth();
                else onOpenSchedule();
              }}
              className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-none hover:scale-[1.03] active:scale-95 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7" />
              </div>
              <span className="font-bold text-base">Schedule</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Plan future class</span>
            </button>

            {/* Share Screen */}
            <button
              onClick={handleStartInstant}
              className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-none hover:scale-[1.03] active:scale-95 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ScreenShare className="w-7 h-7" />
              </div>
              <span className="font-bold text-base">Share Screen</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Direct presentation</span>
            </button>
          </div>

          {/* Quick Join Input Box */}
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 sm:p-3 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none mb-12">
            <form onSubmit={handleJoin} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="Enter Meeting ID or Invitation Link (e.g. nex-123-456)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all shrink-0"
              >
                <span>Join</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Personal Meeting Link Card (If Authenticated) */}
          {isAuthenticated && user?.pmi && (
            <div className="max-w-2xl mx-auto p-4 rounded-3xl bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-transparent border border-blue-200/60 dark:border-blue-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  PMI
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Your Personal Meeting Room</h4>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400">ID: {user.pmi}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={copyPmiLink}
                  className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedPmi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPmi ? 'Copied' : 'Copy Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartMeeting(user.pmi)}
                  className="flex-1 sm:flex-none px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Room</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Feature Showcase Grid (All 4 Requirement Categories) */}
      <section className="py-16 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Everything You Love in Zoom, Free & Unlimited
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Built for educators, teams, and students with robust WebRTC technology and host controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. Video Meeting */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                1. Video Meeting
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> HD Video Calling (360p, 720p, 1080p)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Audio mic & speaker device controls</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Quick mute / camera on & off</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Waiting room & host approval</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Meeting password & security lock</li>
              </ul>
            </div>

            {/* 2. Screen Sharing & Classes */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                <ScreenShare className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                2. Screen Share & Classes
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Share full screen, window or tab</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Interactive whiteboard for lectures</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Raise hand with visual alerts</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Floating emoji reactions & sounds</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Live public & direct group chat</li>
              </ul>
            </div>

            {/* 3. Accounts & Dashboard */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                3. Accounts & Dashboard
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Register, Login & Google OAuth</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Schedule future lectures & meetings</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Upcoming meetings & history log</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Personal Meeting Links (PMI)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Dark mode & Light mode interface</li>
              </ul>
            </div>

            {/* 4. Host & Admin Controls */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                4. Host & Admin Controls
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Host & Co-host role assignments</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Mute participant & "Mute All"</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Remove disruptive participants</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Lock meeting & participant permissions</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Admin Console with stats & reports</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
