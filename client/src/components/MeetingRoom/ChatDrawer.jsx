import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Smile, Lock } from 'lucide-react';

export default function ChatDrawer({
  isOpen,
  onClose,
  messages,
  participants,
  currentSocketId,
  canChat,
  onSendMessage
}) {
  const [text, setText] = useState('');
  const [targetSocketId, setTargetSocketId] = useState('everyone');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const isDirect = targetSocketId !== 'everyone';
    onSendMessage({
      text: text.trim(),
      targetSocketId: isDirect ? targetSocketId : null,
      isDirect
    });
    setText('');
  };

  const insertEmoji = (emoji) => {
    setText(prev => prev + emoji);
  };

  const emojis = ['👍', '👏', '❤️', '🔥', '🎉', '💡', '✅', '🚀'];

  return (
    <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl z-30 transition-all animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">In-Meeting Chat</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Live text discussion & questions</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Target Recipient Selector */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Send to:</span>
        <select
          value={targetSocketId}
          onChange={(e) => setTargetSocketId(e.target.value)}
          className="flex-1 py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none"
        >
          <option value="everyone">Everyone (Public Chat)</option>
          <optgroup label="Direct Message (Private)">
            {participants
              .filter(p => p.socketId !== currentSocketId)
              .map(p => (
                <option key={p.socketId} value={p.socketId}>
                  🔒 {p.name}
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-2">
              <Smile className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1">Start the conversation or ask a question!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderSocketId === currentSocketId;

            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <img
                  src={m.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.senderName}`}
                  alt={m.senderName}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                />

                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {isMe ? 'You' : m.senderName}
                    </span>
                    {m.isDirect && (
                      <span className="px-1 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[9px] font-bold rounded flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Direct
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{m.time}</span>
                  </div>

                  <div className={`p-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : m.isDirect
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-slate-900 dark:text-white border border-amber-200 dark:border-amber-900 rounded-tl-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Shortcuts */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between overflow-x-auto gap-1">
        {emojis.map(e => (
          <button
            key={e}
            type="button"
            onClick={() => insertEmoji(e)}
            className="text-sm p-1 rounded hover:scale-125 transition-transform"
          >
            {e}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {!canChat ? (
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs text-center flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Chat disabled by host
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={targetSocketId === 'everyone' ? 'Message everyone...' : 'Send direct message...'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-md shadow-blue-500/20 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
