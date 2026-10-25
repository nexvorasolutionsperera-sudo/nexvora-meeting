import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { X, Mic, Video, Volume2, Moon, Sun, Check, Sparkles } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [settings, setSettings] = useState({
    muteAudioOnJoin: false,
    turnOffVideoOnJoin: false,
    mirrorVideo: true,
    hdVideo: true,
    resolution: '720p',
    theme: 'dark'
  });

  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user?.settings) {
      setSettings(prev => ({ ...prev, ...user.settings }));
    }
    // Query devices if supported
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const audio = devices.filter(d => d.kind === 'audioinput');
        const video = devices.filter(d => d.kind === 'videoinput');
        setAudioDevices(audio);
        setVideoDevices(video);
        if (audio[0]) setSelectedAudio(audio[0].deviceId);
        if (video[0]) setSelectedVideo(video[0].deviceId);
      }).catch(() => {});
    }
  }, [user]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await updateProfile({ settings });
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
    }
  };

  const testAudioChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Nexvora Settings & Devices
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Video Settings */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-500" />
              Camera & Quality Settings
            </h3>
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              {videoDevices.length > 0 && (
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-300 font-medium block mb-1">
                    Camera Device
                  </label>
                  <select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300 font-medium block mb-1">
                  Video Resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['360p (SD)', '720p (HD)', '1080p (FHD)'].map((res) => {
                    const val = res.split(' ')[0];
                    const active = (settings.resolution || '720p') === val;
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setSettings(p => ({ ...p, resolution: val }))}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {res}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-slate-700 dark:text-slate-300">Mirror my video</span>
                <input
                  type="checkbox"
                  checked={settings.mirrorVideo}
                  onChange={() => handleToggle('mirrorVideo')}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">Turn off video when joining a meeting</span>
                <input
                  type="checkbox"
                  checked={settings.turnOffVideoOnJoin}
                  onChange={() => handleToggle('turnOffVideoOnJoin')}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Audio Settings */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-500" />
              Microphone & Audio Controls
            </h3>
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              {audioDevices.length > 0 && (
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-300 font-medium block mb-1">
                    Microphone Input
                  </label>
                  <select
                    value={selectedAudio}
                    onChange={(e) => setSelectedAudio(e.target.value)}
                    className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {audioDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">Mute microphone when joining a meeting</span>
                <input
                  type="checkbox"
                  checked={settings.muteAudioOnJoin}
                  onChange={() => handleToggle('muteAudioOnJoin')}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">Test audio speaker:</span>
                <button
                  type="button"
                  onClick={testAudioChime}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Play Test Sound
                </button>
              </div>
            </div>
          </div>

          {/* Theme Preference */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Appearance
            </h3>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Interface Theme</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    Dark Mode (Active)
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-500" />
                    Light Mode (Active)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-white" />
                Saved!
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
