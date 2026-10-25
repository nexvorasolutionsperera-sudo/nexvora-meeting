import React from 'react';
import { X, Shield, Lock, Unlock, Users, ScreenShare, MessageSquare, Mic } from 'lucide-react';

export default function SecurityDrawer({
  isOpen,
  onClose,
  isLocked,
  waitingRoomEnabled,
  permissions,
  onToggleLock,
  onToggleWaitingRoom,
  onUpdatePermission
}) {
  if (!isOpen) return null;

  return (
    <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl z-30 transition-all animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Meeting Security</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        
        {/* Room Access Locks */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Access Control
          </h4>
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isLocked ? <Lock className="w-4 h-4 text-rose-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Lock Meeting</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">No new participants can enter</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => onToggleLock(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Enable Waiting Room</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Hold attendees until admitted</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={waitingRoomEnabled}
                onChange={(e) => onToggleWaitingRoom(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

          </div>
        </div>

        {/* Participant Permissions */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Allow Participants To
          </h4>
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ScreenShare className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Share Screen</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Attendees can present window/screen</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={permissions.allowScreenShare}
                onChange={(e) => onUpdatePermission({ allowScreenShare: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Chat with Everyone</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Attendees can send chat messages</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={permissions.allowChat}
                onChange={(e) => onUpdatePermission({ allowChat: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Unmute Themselves</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Attendees can turn microphone back on</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={permissions.allowUnmute}
                onChange={(e) => onUpdatePermission({ allowUnmute: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
