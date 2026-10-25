import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Calendar, Clock, Copy, Check, Play, Trash2, 
  Plus, History, Shield, Lock, Users, Sparkles, ExternalLink
} from 'lucide-react';

export default function Dashboard({ onStartMeeting, onOpenSchedule }) {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'history' | 'pmi'
  const [copiedId, setCopiedId] = useState(null);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const [upData, histData] = await Promise.all([
        api.getUpcomingMeetings(),
        api.getMeetingHistory()
      ]);
      setUpcoming(upData);
      setHistory(histData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;
    try {
      await api.deleteMeeting(id);
      setUpcoming(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete meeting');
    }
  };

  const copyInvite = (meeting) => {
    const url = `${window.location.origin}/?meeting=${meeting.id}`;
    const text = `Join my Nexvora Meeting: ${meeting.title}\nTime: ${new Date(meeting.scheduledDate).toLocaleString()}\nLink: ${url}${meeting.passcode ? `\nPasscode: ${meeting.passcode}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(meeting.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Welcome back, {user?.name} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your online classes, scheduled video conferences, and personal meeting room.
          </p>
        </div>

        <button
          onClick={onOpenSchedule}
          className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Meeting</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Upcoming</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{upcoming.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled sessions</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Completed</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{history.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Past meetings hosted</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Minutes</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {history.reduce((a, b) => a + (b.durationMinutes || 0), 127)} m
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Free video talk time</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Personal Room</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 truncate">{user?.pmi}</p>
          <p className="text-[11px] text-slate-400 mt-1">Always-on instant link</p>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'upcoming'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Upcoming Meetings ({upcoming.length})
          {activeTab === 'upcoming' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Meeting History ({history.length})
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('pmi')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'pmi'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Personal Meeting Room (PMI)
          {activeTab === 'pmi' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Content: Upcoming Meetings */}
      {activeTab === 'upcoming' && (
        <div>
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading your meetings...</div>
          ) : upcoming.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Upcoming Meetings</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                Schedule a future online class or start an instant meeting right now.
              </p>
              <button
                onClick={onOpenSchedule}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                Schedule Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{m.title}</h3>
                      {m.passcode && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Passcode: {m.passcode}
                        </span>
                      )}
                      {m.waitingRoomEnabled && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                          Waiting Room
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(m.scheduledDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(m.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.durationMinutes} min)
                      </span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        ID: {m.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyInvite(m)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === m.id ? 'Copied' : 'Copy Invite'}</span>
                    </button>

                    <button
                      onClick={() => onStartMeeting(m.id)}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Meeting</span>
                    </button>

                    <button
                      onClick={() => handleDelete(m.id)}
                      title="Cancel meeting"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Meeting History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              No past meeting history found.
            </div>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">{h.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    {new Date(h.date).toLocaleDateString()} at {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Duration: {h.durationMinutes} mins
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" /> {h.participantCount} Participants
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Personal Meeting Room */}
      {activeTab === 'pmi' && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personal Meeting ID (PMI)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your Personal Meeting Room is a permanently reserved room that is always ready for your impromptu meetings.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Personal Meeting ID:</span>
              <span className="font-mono font-bold text-sm text-blue-900 dark:text-white">{user?.pmi}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Permanent Link:</span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs">
                {window.location.origin}/?meeting={user?.pmi}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/?meeting=${user?.pmi}`);
                alert('Personal Meeting Link copied to clipboard!');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Invitation
            </button>

            <button
              onClick={() => onStartMeeting(user?.pmi)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Personal Room
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
