import React, { useState } from 'react';
import { 
  X, Search, Mic, MicOff, Video, VideoOff, 
  MoreVertical, Shield, UserMinus, VolumeX, Hand, 
  UserCheck, UserX, Share2 
} from 'lucide-react';

export default function ParticipantsDrawer({
  isOpen,
  onClose,
  participants,
  waitingList,
  currentSocketId,
  isHost,
  isCoHost,
  onMuteParticipant,
  onMuteAll,
  onRemoveParticipant,
  onToggleCoHost,
  onAdmitParticipant,
  onAdmitAll,
  onDenyParticipant,
  onOpenInvite,
  onReportParticipant
}) {
  const [search, setSearch] = useState('');
  const [activeMenuSocketId, setActiveMenuSocketId] = useState(null);

  if (!isOpen) return null;

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const canModerate = isHost || isCoHost;

  return (
    <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl z-30 transition-all animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Participants ({participants.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage audio, video and permissions</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Waiting Room Section (For Hosts/Co-hosts) */}
      {canModerate && waitingList && waitingList.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Waiting Room ({waitingList.length})
            </span>
            <button
              onClick={onAdmitAll}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              Admit All
            </button>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto">
            {waitingList.map((user) => (
              <div 
                key={user.socketId}
                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 shadow-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400">{user.joinedAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onAdmitParticipant(user.socketId)}
                    title="Admit"
                    className="p-1 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDenyParticipant(user.socketId)}
                    title="Deny"
                    className="p-1 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search participants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Active Participants List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredParticipants.map((p) => {
          const isYou = p.socketId === currentSocketId;
          const showMenu = activeMenuSocketId === p.socketId;

          return (
            <div
              key={p.socketId}
              className="relative flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <img
                    src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.name}`}
                    alt={p.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  {p.handRaised && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm animate-pulse">
                      <Hand className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {p.name}
                    </span>
                    {isYou && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {p.isHost && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Host</span>
                    )}
                    {p.isCoHost && !p.isHost && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Co-host</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Icons & Action Menu */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`p-1 rounded-md ${p.audioEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {p.audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </div>

                <div className={`p-1 rounded-md ${p.videoEnabled ? 'text-blue-500' : 'text-slate-400'}`}>
                  {p.videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                </div>

                {/* Moderate Menu Trigger (if host/co-host and not self) */}
                {canModerate && !isYou && (
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuSocketId(showMenu ? null : p.socketId)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {showMenu && (
                      <div 
                        onClick={() => setActiveMenuSocketId(null)}
                        className="absolute right-0 mt-1 w-44 rounded-xl shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs"
                      >
                        {p.audioEnabled && (
                          <button
                            onClick={() => onMuteParticipant(p.socketId)}
                            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <VolumeX className="w-3.5 h-3.5 text-amber-500" />
                            Mute Participant
                          </button>
                        )}

                        {isHost && (
                          <button
                            onClick={() => onToggleCoHost(p.socketId)}
                            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Shield className="w-3.5 h-3.5 text-indigo-500" />
                            {p.isCoHost ? 'Remove Co-host' : 'Make Co-host'}
                          </button>
                        )}

                        <button
                          onClick={() => onRemoveParticipant(p.socketId)}
                          className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Remove from Meeting
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Controls */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex gap-2">
          {canModerate && (
            <button
              onClick={onMuteAll}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <VolumeX className="w-3.5 h-3.5 text-amber-500" />
              Mute All
            </button>
          )}

          <button
            onClick={onOpenInvite}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            Invite
          </button>
        </div>
      </div>
    </div>
  );
}
