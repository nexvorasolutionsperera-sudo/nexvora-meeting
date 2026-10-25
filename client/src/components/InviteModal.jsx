import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare, Mail, Share2, Shield } from 'lucide-react';

export default function InviteModal({ isOpen, onClose, meeting }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !meeting) return null;

  const meetingUrl = `${window.location.origin}/?meeting=${meeting.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyId = () => {
    navigator.clipboard.writeText(meeting.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join my Nexvora HD Video Meeting:\n${meeting.title}\n\nMeeting ID: ${meeting.id}${meeting.hasPasscode ? `\nPasscode: ${meeting.passcode || 'Required'}` : ''}\n\nJoin Link: ${meetingUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Invitation: ${meeting.title}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease join my Nexvora Video Meeting:\n${meeting.title}\n\nJoin Link:\n${meetingUrl}\n\nMeeting ID: ${meeting.id}\n${meeting.hasPasscode ? `Passcode: ${meeting.passcode || 'Contact host'}\n` : ''}\nBest regards,\nNexvora Video Platform`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" />
            Invite Participants
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Share this link or meeting code with your participants</p>
          </div>

          {/* Direct Link */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Meeting Link
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                readOnly
                value={meetingUrl}
                className="w-full bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 outline-none truncate"
              />
              <button
                type="button"
                onClick={copyLink}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 shadow-sm transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Meeting ID & Passcode Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">MEETING ID</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{meeting.id}</span>
                <button
                  onClick={copyId}
                  className="p-1 text-slate-400 hover:text-blue-500"
                  title="Copy ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">PASSCODE</span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {meeting.passcode || (meeting.hasPasscode ? 'Set' : 'None')}
              </span>
            </div>
          </div>

          {/* Quick Sharing Channels */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Instant Share Channels
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-semibold transition-all"
              >
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                WhatsApp
              </button>

              <button
                type="button"
                onClick={shareEmail}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-xs font-semibold transition-all"
              >
                <Mail className="w-4 h-4 text-sky-500" />
                Email Invite
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
