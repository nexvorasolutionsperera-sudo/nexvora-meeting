import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, VideoOff, Hand, Pin, Shield, GraduationCap, ScreenShare, Volume2 } from 'lucide-react';

export default function VideoTile({
  participant,
  stream,
  isLocal = false,
  isPinned = false,
  onPin,
  mirror = false
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Bind video stream and ensure playback
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [stream, isLocal, participant.videoEnabled]);

  // Bind audio stream and ensure playback for remote peers
  useEffect(() => {
    if (audioRef.current && stream && !isLocal) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [stream, isLocal, participant.audioEnabled]);

  // Handle browser autoplay policy restrictions via user interaction
  useEffect(() => {
    const tryResumeMedia = () => {
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('click', tryResumeMedia);
    window.addEventListener('touchstart', tryResumeMedia);
    return () => {
      window.removeEventListener('click', tryResumeMedia);
      window.removeEventListener('touchstart', tryResumeMedia);
    };
  }, []);

  const hasVideo = isLocal 
    ? (participant.videoEnabled && stream && stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live'))
    : (participant.videoEnabled === true && stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.readyState === 'live'));

  const isSpeaking = participant.isSpeaking;

  return (
    <div className={`relative w-full h-full min-h-[180px] rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-200 ${
      isSpeaking
        ? 'ring-4 ring-emerald-500 border-emerald-500 shadow-xl shadow-emerald-500/25'
        : participant.handRaised 
          ? 'ring-2 ring-amber-400 border-amber-400' 
          : 'border-slate-800'
    } flex items-center justify-center group shadow-md`}>
      
      {/* Video Element */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // always mute local audio to prevent feedback loop!
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            hasVideo ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          } ${isLocal && mirror ? 'scale-x-[-1]' : ''}`}
        />
      )}

      {/* Dedicated Remote Audio Output (ensures audio plays 100% reliably in background for 100+ users) */}
      {!isLocal && stream && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
        />
      )}

      {/* Camera Off Avatar Placeholder */}
      {!hasVideo && (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="relative">
            <img
              src={participant.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${participant.name}`}
              alt={participant.name}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-4 ${
                isSpeaking ? 'ring-emerald-500 animate-pulse' : 'ring-slate-800'
              } object-cover shadow-xl bg-slate-800`}
            />
            {isSpeaking && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-lg animate-bounce">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
            )}
            {participant.handRaised && (
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full shadow-lg animate-bounce">
                <Hand className="w-4 h-4 fill-white" />
              </div>
            )}
          </div>
          <span className="mt-2.5 text-xs sm:text-sm font-semibold text-slate-200 max-w-[150px] truncate text-center">
            {participant.name} {isLocal && '(You)'}
          </span>
        </div>
      )}

      {/* Hand Raised Floating Banner */}
      {participant.handRaised && hasVideo && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-xs font-semibold backdrop-blur-md shadow-lg animate-pulse">
          <Hand className="w-3.5 h-3.5 fill-white" />
          <span>Raised Hand</span>
        </div>
      )}

      {/* Speaking Indicator Top Banner */}
      {isSpeaking && (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600/90 text-white text-[11px] font-bold backdrop-blur-md shadow-md animate-pulse">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Speaking</span>
        </div>
      )}

      {/* Top Right Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {participant.screenSharing && (
          <span className="px-2 py-0.5 rounded-lg bg-blue-600/90 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-md shadow-sm">
            <ScreenShare className="w-3.5 h-3.5" /> Screen
          </span>
        )}
        {onPin && (
          <button
            type="button"
            onClick={onPin}
            title={isPinned ? 'Unpin video' : 'Pin video'}
            className={`p-1.5 rounded-xl backdrop-blur-md transition-all ${
              isPinned 
                ? 'bg-blue-600 text-white' 
                : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-medium max-w-[80%] truncate">
          {participant.isHost && (
            <span className="bg-blue-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> Host
            </span>
          )}
          {participant.isCoHost && !participant.isHost && (
            <span className="bg-indigo-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
              <GraduationCap className="w-2.5 h-2.5" /> Co-host
            </span>
          )}
          <span className="truncate">{participant.name} {isLocal && '(You)'}</span>
        </div>

        {/* Audio / Video Status Indicator */}
        <div className="flex items-center gap-1">
          <div className={`p-1.5 rounded-lg backdrop-blur-md ${
            participant.audioEnabled ? 'bg-black/60 text-emerald-400' : 'bg-rose-600 text-white'
          }`}>
            {participant.audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </div>
          {!participant.videoEnabled && (
            <div className="p-1.5 rounded-lg bg-rose-600 text-white backdrop-blur-md">
              <VideoOff className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
